<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMachineRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $orgId = $this->user()->organization_id;
        $machineId = $this->route('machine')?->id;

        return [
            'area_id' => ['sometimes', 'required', 'integer'],
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:64',
                Rule::unique('machines', 'code')
                    ->where('organization_id', $orgId)
                    ->ignore($machineId),
            ],
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.unique' => 'Kode mesin sudah digunakan oleh mesin lain di organisasi Anda.',
        ];
    }
}
