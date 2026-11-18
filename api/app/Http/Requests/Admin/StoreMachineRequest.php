<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

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
        return [
            'area_id' => ['required', 'integer'],
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
            'name.required' => 'Nama mesin wajib diisi.',
        ];
    }
}
