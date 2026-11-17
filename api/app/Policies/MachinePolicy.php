<?php

namespace App\Policies;

use App\Models\Machine;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class MachinePolicy
{
    public function view(User $user, Machine $machine): Response
    {
        return $user->organization_id === $machine->organization_id
            ? Response::allow()
            : Response::deny('Anda tidak memiliki akses ke mesin organisasi lain.');
    }
}
