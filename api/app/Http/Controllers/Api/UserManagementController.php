<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DomainRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Site;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserManagementController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = User::query()
            ->forOrganization($request->user()->organization_id)
            ->with(['site:id,name,code'])
            ->orderBy('name');

        if ($request->filled('role')) {
            $query->where('role', (string) $request->query('role'));
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return UserResource::collection($query->paginate(min(100, max(1, (int) $request->integer('per_page', 20)))));
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $siteId = $this->resolveOrganizationSite($orgId, $request->validated('site_id'));

        $user = User::query()->create([
            'organization_id' => $orgId,
            'site_id' => $siteId,
            'name' => trim((string) $request->validated('name')),
            'email' => Str::lower(trim((string) $request->validated('email'))),
            'password' => Hash::make((string) $request->validated('password')),
            'role' => $request->validated('role'),
            'job_title' => $request->validated('job_title'),
            'is_active' => (bool) ($request->validated('is_active') ?? true),
            'email_verified_at' => now(),
        ]);

        return response()->json([
            'message' => 'Pengguna berhasil ditambahkan.',
            'data' => new UserResource($user->load(['organization', 'site'])),
        ], 201);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $actor = $request->user();
        if ($user->organization_id !== $actor->organization_id) {
            abort(403, 'Anda tidak memiliki akses ke pengguna organisasi lain.');
        }

        $updates = [];

        if ($request->has('site_id')) {
            $updates['site_id'] = $this->resolveOrganizationSite($actor->organization_id, $request->validated('site_id'));
        }

        if ($request->has('name')) {
            $updates['name'] = trim((string) $request->validated('name'));
        }

        if ($request->has('role')) {
            if ($user->id === $actor->id && $request->validated('role') !== $actor->role->value) {
                throw new DomainRuleException('Anda tidak dapat mengubah peran akun Anda sendiri.', 'CANNOT_DEMOTE_SELF');
            }
            $updates['role'] = $request->validated('role');
        }

        if ($request->has('job_title')) {
            $updates['job_title'] = $request->validated('job_title');
        }

        if ($request->has('is_active')) {
            $isActive = (bool) $request->validated('is_active');
            if ($user->id === $actor->id && ! $isActive) {
                throw new DomainRuleException('Anda tidak dapat menonaktifkan akun Anda sendiri.', 'CANNOT_DEACTIVATE_SELF');
            }
            $updates['is_active'] = $isActive;
            if (! $isActive) {
                $user->tokens()->delete();
            }
        }

        if ($request->filled('password')) {
            $updates['password'] = Hash::make((string) $request->validated('password'));
            $user->tokens()->delete();
        }

        $user->update($updates);

        return response()->json([
            'message' => 'Data pengguna berhasil diperbarui.',
            'data' => new UserResource($user->fresh(['organization', 'site'])),
        ]);
    }

    private function resolveOrganizationSite(int $organizationId, mixed $siteId): ?int
    {
        if ($siteId === null) {
            return null;
        }

        $exists = Site::query()
            ->forOrganization($organizationId)
            ->where('is_active', true)
            ->whereKey((int) $siteId)
            ->exists();

        if (! $exists) {
            throw new DomainRuleException('Site/pabrik tidak ditemukan pada organisasi Anda.', 'INVALID_SITE', 422, [
                'site_id' => ['Site/pabrik tidak valid untuk organisasi Anda.'],
            ]);
        }

        return (int) $siteId;
    }
}
