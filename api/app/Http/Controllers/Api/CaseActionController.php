<?php

namespace App\Http\Controllers\Api;

use App\Enums\ActionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Actions\CompleteCaseActionRequest;
use App\Http\Requests\Actions\UpdateCaseActionRequest;
use App\Http\Requests\Attachments\StoreAttachmentRequest;
use App\Http\Resources\AttachmentResource;
use App\Http\Resources\CaseActionResource;
use App\Models\CaseAction;
use App\Services\CaseWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class CaseActionController extends Controller
{
    public function __construct(
        private readonly CaseWorkflowService $workflow,
    ) {}

    public function myActions(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $statusFilter = (string) $request->query('status', ActionStatus::Open->value);

        $query = CaseAction::query()
            ->forOrganization($user->organization_id)
            ->where('pic_user_id', $user->id)
            ->with([
                'safetyCase:id,case_number,status,risk_level,is_locked,machine_id',
                'safetyCase.machine:id,code,name',
                'pic:id,name,email,role,job_title',
                'creator:id,name,role',
                'completer:id,name',
                'attachments',
            ])
            ->orderBy('due_at')
            ->orderBy('id');

        if ($statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        if ($request->boolean('overdue')) {
            $query->where('status', ActionStatus::Open->value)
                ->where('due_at', '<', now());
        }

        $perPage = min(100, max(1, (int) $request->integer('per_page', 20)));

        return CaseActionResource::collection($query->paginate($perPage));
    }

    public function update(UpdateCaseActionRequest $request, CaseAction $action): JsonResponse
    {
        Gate::authorize('update', $action);

        $updated = $this->workflow->updateAction($request->user(), $action, $request->validated());

        return response()->json([
            'message' => 'Tindakan berhasil diperbarui.',
            'data' => new CaseActionResource($updated),
        ]);
    }

    public function complete(CompleteCaseActionRequest $request, CaseAction $action): JsonResponse
    {
        Gate::authorize('complete', $action);

        $updated = $this->workflow->completeAction(
            actor: $request->user(),
            action: $action,
            data: $request->validated(),
            photos: $this->extractUploadedPhotos($request),
        );

        return response()->json([
            'message' => 'Tindakan berhasil ditandai selesai.',
            'data' => new CaseActionResource($updated),
            'case_status' => $updated->safetyCase->status->value,
            'case_status_label' => $updated->safetyCase->status->label(),
        ]);
    }

    public function reopen(Request $request, CaseAction $action): JsonResponse
    {
        Gate::authorize('reopen', $action);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:1000'],
        ], [
            'reason.required' => 'Alasan pembukaan ulang tindakan wajib diisi.',
        ]);

        $updated = $this->workflow->reopenAction($request->user(), $action, $validated['reason']);

        return response()->json([
            'message' => 'Tindakan dibuka ulang untuk dikerjakan kembali.',
            'data' => new CaseActionResource($updated),
            'case_status' => $updated->safetyCase->status->value,
            'case_status_label' => $updated->safetyCase->status->label(),
        ]);
    }

    public function storeAttachments(StoreAttachmentRequest $request, CaseAction $action): JsonResponse
    {
        Gate::authorize('uploadAttachment', $action);

        $attachments = $this->workflow->attachPhotosToAction(
            actor: $request->user(),
            action: $action,
            photos: $this->extractUploadedPhotos($request),
        );

        return response()->json([
            'message' => 'Foto bukti tindakan berhasil diunggah.',
            'data' => AttachmentResource::collection($attachments),
        ], 201);
    }
}
