<?php

namespace App\Policies;

use App\Models\CaseAction;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class CaseActionPolicy
{
    public function update(User $user, CaseAction $action): Response
    {
        if ($user->organization_id !== $action->organization_id) {
            return Response::deny('Anda tidak memiliki akses ke tindakan organisasi lain.');
        }

        return $user->role->canManageActions()
            ? Response::allow()
            : Response::deny('Anda tidak memiliki hak akses untuk mengubah tindakan.');
    }

    public function complete(User $user, CaseAction $action): Response
    {
        if ($user->organization_id !== $action->organization_id) {
            return Response::deny('Anda tidak memiliki akses ke tindakan organisasi lain.');
        }

        return $action->pic_user_id === $user->id
            ? Response::allow()
            : Response::deny('Hanya PIC yang ditunjuk yang dapat menyelesaikan tindakan ini.');
    }

    public function reopen(User $user, CaseAction $action): Response
    {
        if ($user->organization_id !== $action->organization_id) {
            return Response::deny('Anda tidak memiliki akses ke tindakan organisasi lain.');
        }

        return $user->role->canVerify()
            ? Response::allow()
            : Response::deny('Hanya K3/Verifikator atau Manajer/Admin yang dapat membuka ulang tindakan.');
    }

    public function uploadAttachment(User $user, CaseAction $action): Response
    {
        if ($user->organization_id !== $action->organization_id) {
            return Response::deny('Anda tidak memiliki akses ke tindakan organisasi lain.');
        }

        if ($action->pic_user_id !== $user->id && ! $user->role->canManageActions()) {
            return Response::deny('Anda tidak memiliki hak akses untuk mengunggah bukti pada tindakan ini.');
        }

        return Response::allow();
    }
}
