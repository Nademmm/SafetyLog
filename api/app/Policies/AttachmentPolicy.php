<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Attachment;
use App\Models\CaseAction;
use App\Models\SafetyCase;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class AttachmentPolicy
{
    public function view(User $user, Attachment $attachment): Response
    {
        if ($user->organization_id !== $attachment->organization_id) {
            return Response::deny('Anda tidak memiliki akses ke lampiran organisasi lain.');
        }

        $attachable = $attachment->attachable;

        if ($attachable instanceof SafetyCase) {
            return app(SafetyCasePolicy::class)->view($user, $attachable);
        }

        if ($attachable instanceof CaseAction && $attachable->safetyCase) {
            return app(SafetyCasePolicy::class)->view($user, $attachable->safetyCase);
        }

        return Response::deny('Lampiran tidak terkait dengan kasus yang dapat Anda akses.');
    }

    public function delete(User $user, Attachment $attachment): Response
    {
        if ($user->organization_id !== $attachment->organization_id) {
            return Response::deny('Anda tidak memiliki akses ke lampiran organisasi lain.');
        }

        $isUploader = $attachment->uploaded_by === $user->id;
        if (! $isUploader && $user->role !== UserRole::Admin) {
            return Response::deny('Hanya pengunggah atau Manajer/Admin yang dapat menghapus lampiran.');
        }

        return Response::allow();
    }
}
