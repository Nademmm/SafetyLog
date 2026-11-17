<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Services\CaseWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttachmentController extends Controller
{
    public function __construct(
        private readonly CaseWorkflowService $workflow,
    ) {}

    public function show(Request $request, Attachment $attachment): StreamedResponse
    {
        Gate::authorize('view', $attachment);

        $disk = Storage::disk($attachment->disk);

        if (! $disk->exists($attachment->file_path)) {
            abort(404, 'Berkas lampiran tidak ditemukan.');
        }

        $safeName = Str::ascii(str_replace(['"', "\r", "\n"], '', $attachment->original_name));

        return $disk->response($attachment->file_path, $safeName, [
            'Content-Type' => $attachment->mime_type,
            'Content-Disposition' => 'inline; filename="'.$safeName.'"',
            'Cache-Control' => 'private, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function destroy(Request $request, Attachment $attachment): JsonResponse
    {
        Gate::authorize('delete', $attachment);

        $this->workflow->deleteAttachment($attachment);

        return response()->json([
            'message' => 'Lampiran berhasil dihapus.',
        ]);
    }
}
