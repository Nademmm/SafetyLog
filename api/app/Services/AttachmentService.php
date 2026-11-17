<?php

namespace App\Services;

use App\Models\Attachment;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AttachmentService
{
    /**
     * @param  list<UploadedFile>  $files
     * @return list<Attachment>
     */
    public function storePhotos(Model $attachable, int $organizationId, User $uploader, array $files): array
    {
        $stored = [];
        $directory = sprintf('organizations/%d/attachments/%s/%d', $organizationId, Str::snake(class_basename($attachable)), $attachable->getKey());

        foreach ($files as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $extension = strtolower($file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'jpg');
            $filename = Str::uuid()->toString().'.'.$extension;
            $path = $file->storeAs($directory, $filename, 'local');

            $stored[] = Attachment::query()->create([
                'organization_id' => $organizationId,
                'attachable_type' => $attachable->getMorphClass(),
                'attachable_id' => $attachable->getKey(),
                'uploaded_by' => $uploader->id,
                'disk' => 'local',
                'file_path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType() ?: $file->getClientMimeType() ?: 'image/jpeg',
                'file_size' => (int) $file->getSize(),
            ]);
        }

        return $stored;
    }

    public function deleteAttachment(Attachment $attachment): void
    {
        Storage::disk($attachment->disk)->delete($attachment->file_path);
        $attachment->delete();
    }
}
