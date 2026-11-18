<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\SafetyCase;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class SafetyCasePolicy
{
    public function viewAny(User $user): Response
    {
        return $user->role->canViewAllCases()
            ? Response::allow()
            : Response::deny('Anda tidak memiliki akses ke antrean seluruh kasus.');
    }

    public function create(User $user): bool
    {
        return $user->is_active;
    }

    public function view(User $user, SafetyCase $case): Response
    {
        if ($user->organization_id !== $case->organization_id) {
            return Response::deny('Anda tidak memiliki akses ke kasus organisasi lain.');
        }

        if ($user->role === UserRole::Reporter) {
            $isOwnOrAssigned = $case->reporter_id === $user->id
                || $case->assigned_pic_id === $user->id
                || $case->actions()->where('pic_user_id', $user->id)->exists();

            if (! $isOwnOrAssigned) {
                return Response::deny('Pelapor hanya dapat melihat kasus yang dilaporkannya atau yang ditugaskan kepadanya.');
            }
        }

        return Response::allow();
    }

    public function viewSummary(User $user, SafetyCase $case): Response
    {
        if ($user->organization_id !== $case->organization_id) {
            return Response::deny('Anda tidak memiliki akses ke kasus organisasi lain.');
        }

        if ($case->status->isOpen() || $user->role->canViewAllCases() || $case->reported_by === $user->id) {
            return Response::allow();
        }

        return Response::deny('Ringkasan kasus tertutup hanya dapat diakses oleh pihak terkait atau tim penanganan.');
    }

    public function triage(User $user, SafetyCase $case): Response
    {
        if ($user->organization_id !== $case->organization_id) {
            return Response::deny('Anda tidak memiliki akses ke kasus organisasi lain.');
        }

        return $user->role->canTriage()
            ? Response::allow()
            : Response::deny('Hanya Supervisor atau Manajer/Admin yang dapat melakukan triase.');
    }

    public function manageActions(User $user, SafetyCase $case): Response
    {
        if ($user->organization_id !== $case->organization_id) {
            return Response::deny('Anda tidak memiliki akses ke kasus organisasi lain.');
        }

        return $user->role->canManageActions()
            ? Response::allow()
            : Response::deny('Anda tidak memiliki hak akses untuk mengelola tindakan.');
    }

    public function verify(User $user, SafetyCase $case): Response
    {
        if ($user->organization_id !== $case->organization_id) {
            return Response::deny('Anda tidak memiliki akses ke kasus organisasi lain.');
        }

        return $user->role->canVerify()
            ? Response::allow()
            : Response::deny('Hanya K3/Verifikator atau Manajer/Admin yang dapat memverifikasi kasus.');
    }

    public function reopen(User $user, SafetyCase $case): Response
    {
        if ($user->organization_id !== $case->organization_id) {
            return Response::deny('Anda tidak memiliki akses ke kasus organisasi lain.');
        }

        return $user->role->canVerify()
            ? Response::allow()
            : Response::deny('Hanya K3/Verifikator atau Manajer/Admin yang dapat membuka ulang kasus.');
    }

    public function uploadAttachment(User $user, SafetyCase $case): Response
    {
        if ($user->organization_id !== $case->organization_id) {
            return Response::deny('Anda tidak memiliki akses ke kasus organisasi lain.');
        }

        $isReporter = $case->reporter_id === $user->id;
        if (! $isReporter && ! $user->role->canManageActions()) {
            return Response::deny('Anda tidak memiliki hak akses untuk mengunggah lampiran pada kasus ini.');
        }

        return Response::allow();
    }
}
