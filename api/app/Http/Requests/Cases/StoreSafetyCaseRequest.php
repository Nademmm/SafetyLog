<?php

namespace App\Http\Requests\Cases;

use App\Http\Requests\Concerns\ValidatesPhotoUploads;
use Illuminate\Foundation\Http\FormRequest;

class StoreSafetyCaseRequest extends FormRequest
{
    use ValidatesPhotoUploads;

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
            'machine_id' => ['required', 'integer'],
            'case_type_id' => ['required', 'integer'],
            'description' => ['required', 'string', 'min:5', 'max:5000'],
            'is_machine_stopped' => ['nullable', 'boolean'],
            'has_affected_people' => ['nullable', 'boolean'],
            ...$this->photoUploadRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'machine_id.required' => 'Mesin wajib dipilih.',
            'case_type_id.required' => 'Jenis kasus wajib dipilih.',
            'description.required' => 'Deskripsi kejadian wajib diisi.',
            'description.min' => 'Deskripsi minimal 5 karakter.',
            ...$this->photoUploadMessages(),
        ];
    }
}
