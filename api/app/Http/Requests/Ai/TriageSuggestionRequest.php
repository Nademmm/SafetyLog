<?php

namespace App\Http\Requests\Ai;

use Illuminate\Foundation\Http\FormRequest;

class TriageSuggestionRequest extends FormRequest
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
            'case_id' => ['nullable', 'integer'],
            'description' => ['required_without:case_id', 'nullable', 'string', 'min:5', 'max:5000'],
            'case_type_id' => ['nullable', 'integer'],
            'machine_id' => ['nullable', 'integer'],
            'is_machine_stopped' => ['nullable', 'boolean'],
            'has_affected_people' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'description.required_without' => 'Deskripsi laporan wajib diisi.',
            'description.min' => 'Deskripsi minimal 5 karakter.',
            'description.max' => 'Deskripsi maksimal 5000 karakter.',
        ];
    }
}
