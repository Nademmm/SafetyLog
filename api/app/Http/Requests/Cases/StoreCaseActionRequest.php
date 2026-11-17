<?php

namespace App\Http\Requests\Cases;

use Illuminate\Foundation\Http\FormRequest;

class StoreCaseActionRequest extends FormRequest
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
            'action_type' => ['required', 'string'],
            'title' => ['required', 'string', 'min:3', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'pic_user_id' => ['required', 'integer'],
            'due_at' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'action_type.required' => 'Jenis tindakan wajib dipilih.',
            'title.required' => 'Judul tindakan wajib diisi.',
            'title.min' => 'Judul tindakan minimal 3 karakter.',
            'pic_user_id.required' => 'PIC tindakan wajib dipilih.',
            'due_at.date' => 'Format tenggat waktu tidak valid.',
        ];
    }
}
