<?php

namespace App\Services;

use App\Models\Attachment;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class AttachmentService
{
    /**
     * @param  list<UploadedFile>  $files
     * @return list<Attachment>
     */
    public function storePhotos(Model $attachable, int $organizationId, User $uploader, array $files): array
    {
        $stored = [];
        $storedPaths = [];
        $directory = sprintf('organizations/%d/attachments/%s/%d', $organizationId, Str::snake(class_basename($attachable)), $attachable->getKey());

        try {
            foreach ($files as $file) {
                if (! $file instanceof UploadedFile) {
                    continue;
                }

                $extension = strtolower($file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'jpg');
                $filename = Str::uuid()->toString().'.'.$extension;
                $path = $file->storeAs($directory, $filename, 'local');

                if ($path === false) {
                    throw new RuntimeException('Gagal menyimpan berkas foto ke penyimpanan.');
                }

                $storedPaths[] = $path;
                $originalName = Str::limit((string) $file->getClientOriginalName(), 255, '');

                $stored[] = Attachment::query()->create([
                    'organization_id' => $organizationId,
                    'attachable_type' => $attachable->getMorphClass(),
                    'attachable_id' => $attachable->getKey(),
                    'uploaded_by' => $uploader->id,
                    'disk' => 'local',
                    'file_path' => $path,
                    'original_name' => $originalName !== '' ? $originalName : $filename,
                    'mime_type' => $file->getMimeType() ?: $file->getClientMimeType() ?: 'image/jpeg',
                    'file_size' => (int) $file->getSize(),
                ]);
            }
        } catch (Throwable $e) {
            foreach ($storedPaths as $orphanPath) {
                Storage::disk('local')->delete($orphanPath);
            }

            throw $e;
        }

        return $stored;
    }

    public function deleteAttachment(Attachment $attachment): void
    {
        $disk = $attachment->disk;
        $path = $attachment->file_path;

        $attachment->delete();

        DB::afterCommit(function () use ($disk, $path): void {
            Storage::disk($disk)->delete($path);
        });
    }
}
