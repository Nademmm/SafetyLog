<?php

namespace App\Http\Requests\Cases;

use Illuminate\Foundation\Http\FormRequest;

class StoreRootCauseRequest extends FormRequest
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
            'root_cause_category' => ['required', 'string', 'max:64'],
            'five_whys' => ['required', 'array', 'min:1', 'max:5'],
            'five_whys.*' => ['required', 'string', 'min:3', 'max:1000'],
            'root_cause_summary' => ['nullable', 'string', 'max:3000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'root_cause_category.required' => 'Kategori akar penyebab (6M) wajib dipilih.',
            'five_whys.required' => 'Minimal 1 baris analisis 5 Why wajib diisi.',
            'five_whys.max' => 'Analisis 5 Why maksimal 5 baris.',
            'five_whys.*.required' => 'Setiap baris Why tidak boleh kosong.',
            'five_whys.*.min' => 'Setiap baris Why minimal 3 karakter.',
        ];
    }
}
