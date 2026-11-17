<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Services\CaseWorkflowService;
use Illuminate\Filesystem\FilesystemAdapter;
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
        $headers = [
            'Content-Type' => $attachment->mime_type,
            'Content-Disposition' => 'inline; filename="'.$safeName.'"',
            'Cache-Control' => 'private, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ];

        if ($disk instanceof FilesystemAdapter) {
            return $disk->response($attachment->file_path, $safeName, $headers);
        }

        return response()->stream(function () use ($disk, $attachment): void {
            $stream = $disk->readStream($attachment->file_path);
            if ($stream !== null) {
                fpassthru($stream);
                fclose($stream);
            }
        }, 200, $headers);
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
