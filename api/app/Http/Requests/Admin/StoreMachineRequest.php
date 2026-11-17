<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMachineRequest extends FormRequest
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

        return [
            'area_id' => ['required', 'integer'],
            'code' => [
                'required',
                'string',
                'max:64',
                Rule::unique('machines', 'code')->where('organization_id', $orgId),
            ],
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'area_id.required' => 'Area produksi wajib dipilih.',
            'code.required' => 'Kode mesin wajib diisi.',
            'code.unique' => 'Kode mesin sudah terdaftar di organisasi Anda.',
            'name.required' => 'Nama mesin wajib diisi.',
        ];
    }
}
