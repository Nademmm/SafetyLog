<?php

namespace App\Http\Requests\Ai;

use App\Models\SafetyCase;
use Illuminate\Foundation\Http\FormRequest;

class SimilarAnalysisRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $case = $this->route('case');

        if ($case instanceof SafetyCase) {
            $this->merge(['case_id' => $case->id]);
        }
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
            'limit' => ['nullable', 'integer', 'min:1', 'max:10'],
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
            'limit.min' => 'Jumlah kandidat minimal 1.',
            'limit.max' => 'Jumlah kandidat maksimal 10.',
        ];
    }
}
