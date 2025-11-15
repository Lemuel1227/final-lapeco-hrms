<?php

namespace App\Http\Controllers;

use App\Models\TrainingProgram;
use App\Models\TrainingEnrollment;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use App\Traits\LogsActivity;

class TrainingController extends Controller
{
    use LogsActivity;
    /**
     * Display a listing of training programs with enrollment statistics.
     */
    public function index(): JsonResponse
    {
        $programs = TrainingProgram::with(['enrollments.user:id,first_name,middle_name,last_name'])
            ->orderBy('created_at', 'desc')
            ->get();

        // Add enrollment statistics to each program
        $programs->each(function ($program) {
            $enrollments = $program->enrollments;
            $program->enrolled_count = $enrollments->count();
            $program->completed_count = $enrollments->where('status', 'Completed')->count();
            $program->completion_rate = $program->enrolled_count > 0 
                ? round(($program->completed_count / $program->enrolled_count) * 100, 1) 
                : 0;
            
            // Compute full name for each enrolled user
            $program->enrollments->each(function ($enrollment) {
                if ($enrollment->user) {
                    $enrollment->user->name = trim(implode(' ', array_filter([
                        $enrollment->user->first_name,
                        $enrollment->user->middle_name,
                        $enrollment->user->last_name,
                    ])));
                }
            });
        });

        return response()->json($programs);
    }

    /**
     * Display a listing of all training programs.
     */
    public function programs(): JsonResponse
    {
        $programs = TrainingProgram::orderBy('created_at', 'desc')->get();
        return response()->json($programs);
    }

    /**
     * Store a newly created training program.
     */
    public function storeProgram(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'provider' => 'nullable|string|max:255',
            'duration' => 'nullable|string|max:100',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            // status is now auto-computed; accept optional input but ignore
            'status' => ['nullable', Rule::in(['Inactive', 'Active', 'Completed', 'Cancelled'])],
            'cost' => 'nullable|numeric|min:0',
            'location' => 'nullable|string|max:255',
            'type' => ['required', Rule::in(['Online', 'In-person', 'Hybrid'])],
            'max_participants' => 'nullable|integer|min:1',
            'requirements' => 'nullable|string',
            'positions_allowed' => 'nullable|array',
            'positions_allowed.*' => 'integer|exists:positions,id'
        ]);

        // Create program without trusting provided status
        $payload = collect($validated)->except('status')->toArray();
        if (!Schema::hasColumn('training_programs', 'positions_allowed')) {
            unset($payload['positions_allowed']);
        }
        $program = TrainingProgram::create($payload);

        // Auto-compute status based on enrollments
        $program->status = $this->computeProgramStatus($program);
        try {
            $program->save();
        } catch (\Throwable $e) {
            // Fallback for legacy enum schemas that don't include 'Inactive'
            $msg = strtolower($e->getMessage());
            $isEnumIssue = str_contains($msg, 'enum') || str_contains($msg, 'data truncated for column') || str_contains($msg, 'sqlstate[01000]');
            if ($isEnumIssue && $program->status === 'Inactive') {
                $program->status = 'Draft';
                $program->save();
            } else {
                throw $e;
            }
        }
        
        // Log activity
        $this->logCreate('training_program', $program->id, $program->title);

        return response()->json([
            'message' => 'Training program created successfully',
            'program' => $program
        ], 201);
    }

    /**
     * Display the specified training program with enrollments.
     */
    public function show($id): JsonResponse
    {
        $program = TrainingProgram::with(['enrollments.user:id,first_name,middle_name,last_name'])
            ->findOrFail($id);

        // Compute full name for each enrolled user
        $program->enrollments->each(function ($enrollment) {
            if ($enrollment->user) {
                $enrollment->user->name = trim(implode(' ', array_filter([
                    $enrollment->user->first_name,
                    $enrollment->user->middle_name,
                    $enrollment->user->last_name,
                ])));
            }
        });

        return response()->json($program);
    }

    /**
     * Update the specified training program.
     */
    public function updateProgram(Request $request, $id): JsonResponse
    {
        $program = TrainingProgram::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'provider' => 'nullable|string|max:255',
            'duration' => 'nullable|string|max:100',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            // status is auto-computed; accept optional for compatibility but ignore
            'status' => ['nullable', Rule::in(['Inactive', 'Active', 'Completed', 'Cancelled'])],
            'cost' => 'nullable|numeric|min:0',
            'location' => 'nullable|string|max:255',
            'type' => ['required', Rule::in(['Online', 'In-person', 'Hybrid'])],
            'max_participants' => 'nullable|integer|min:1',
            'requirements' => 'nullable|string',
            'positions_allowed' => 'nullable|array',
            'positions_allowed.*' => 'integer|exists:positions,id'
        ]);

        // Update program without trusting provided status
        $payload = collect($validated)->except('status')->toArray();
        if (!Schema::hasColumn('training_programs', 'positions_allowed')) {
            unset($payload['positions_allowed']);
        }
        $program->update($payload);

        // Auto-compute status after update
        $computed = $this->computeProgramStatus($program);
        if ($program->status !== $computed) {
            $program->status = $computed;
            try {
                $program->save();
            } catch (\Throwable $e) {
                $msg = strtolower($e->getMessage());
                $isEnumIssue = str_contains($msg, 'enum') || str_contains($msg, 'data truncated for column') || str_contains($msg, 'sqlstate[01000]');
                if ($isEnumIssue && $program->status === 'Inactive') {
                    $program->status = 'Draft';
                    $program->save();
                } else {
                    throw $e;
                }
            }
        }
        
        // Log activity
        $this->logUpdate('training_program', $program->id, $program->title);

        return response()->json([
            'message' => 'Training program updated successfully',
            'program' => $program
        ]);
    }

    /**
     * Compute training program status based on enrollments.
     */
    private function computeProgramStatus(TrainingProgram $program): string
    {
        $enrollments = $program->enrollments()->get();
        $total = $enrollments->count();
        if ($total === 0) {
            return 'Inactive';
        }
        $completedCount = $enrollments->filter(function ($e) {
            return strtolower($e->status) === 'completed';
        })->count();
        return $completedCount === $total ? 'Completed' : 'Active';
    }

    /**
     * Remove the specified training program.
     */
    public function destroyProgram($id): JsonResponse
    {
        $program = TrainingProgram::findOrFail($id);
        
        // Check if there are any enrollments
        $enrollmentCount = $program->enrollments()->count();
        if ($enrollmentCount > 0) {
            return response()->json([
                'message' => 'This program has existing enrollments. Deleting it will also remove all enrollment records.',
                'warning' => true,
                'enrollment_count' => $enrollmentCount,
                'program_id' => $id
            ], 200); // Changed from 422 to 200 to indicate it's a warning, not an error
        }

        $programTitle = $program->title;
        $programId = $program->id;
        $program->delete();
        
        // Log activity
        $this->logDelete('training_program', $programId, $programTitle);

        return response()->json([
            'message' => 'Training program deleted successfully'
        ]);
    }

    /**
     * Force delete the specified training program with enrollments.
     */
    public function forceDestroyProgram($id): JsonResponse
    {
        $program = TrainingProgram::findOrFail($id);
        
        // Delete all enrollments first
        $program->enrollments()->delete();
        
        // Then delete the program
        $program->delete();

        return response()->json([
            'message' => 'Training program and all associated enrollments deleted successfully'
        ]);
    }

    /**
     * Get all enrollments for training programs.
     */
    public function enrollments(): JsonResponse
    {
        $enrollments = TrainingEnrollment::with([
            'program:id,title', 
            'user:id,first_name,middle_name,last_name'
        ])
            ->orderBy('created_at', 'desc')
            ->get();

        // Compute full name for each user
        $enrollments->each(function ($enrollment) {
            if ($enrollment->user) {
                $enrollment->user->name = trim(implode(' ', array_filter([
                    $enrollment->user->first_name,
                    $enrollment->user->middle_name,
                    $enrollment->user->last_name,
                ])));
            }
        });

        return response()->json($enrollments);
    }

    /**
     * Enroll a user in a training program.
     */
    public function enroll(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'program_id' => 'required|exists:training_programs,id',
            'user_id' => 'required|exists:users,id',
            'notes' => 'nullable|string'
        ]);

        // Check if user is already enrolled
        $existingEnrollment = TrainingEnrollment::where('program_id', $validated['program_id'])
            ->where('user_id', $validated['user_id'])
            ->first();

        if ($existingEnrollment) {
            return response()->json([
                'message' => 'User is already enrolled in this program'
            ], 422);
        }

        // Check program capacity
        $program = TrainingProgram::findOrFail($validated['program_id']);
        // Restrict by allowed positions if defined
        $allowed = $program->positions_allowed;
        if (is_string($allowed)) {
            $decoded = json_decode($allowed, true);
            $allowed = is_array($decoded) ? $decoded : [];
        }
        if (is_array($allowed) && !empty($allowed)) {
            $targetUser = User::findOrFail($validated['user_id']);
            if (!in_array((int)$targetUser->position_id, array_map('intval', $allowed), true)) {
                return response()->json([
                    'message' => 'Your position is not eligible for this program'
                ], 422);
            }
        }
        if ($program->max_participants) {
            $currentEnrollments = $program->enrollments()->count();
            if ($currentEnrollments >= $program->max_participants) {
                return response()->json([
                    'message' => 'Program has reached maximum capacity'
                ], 422);
            }
        }

        $enrollment = TrainingEnrollment::create([
            'program_id' => $validated['program_id'],
            'user_id' => $validated['user_id'],
            'status' => 'Not Started',
            'progress' => 0,
            'enrolled_at' => now(),
            'notes' => $validated['notes'] ?? null
        ]);

        $enrollment->load(['program:id,title', 'user:id,first_name,middle_name,last_name']);

        // Compute full name for the user
        if ($enrollment->user) {
            $enrollment->user->name = trim(implode(' ', array_filter([
                $enrollment->user->first_name,
                $enrollment->user->middle_name,
                $enrollment->user->last_name,
            ])));
        }
        
        // Log activity
        $userName = $enrollment->user->name ?? 'User';
        $this->logCustomActivity('enroll', "Enrolled {$userName} in {$program->title}", 'training_enrollment', $enrollment->id);

        return response()->json([
            'message' => 'User enrolled successfully',
            'enrollment' => $enrollment
        ], 201);
    }

    /**
     * Update enrollment status and progress.
     */
    public function updateEnrollment(Request $request, $id): JsonResponse
    {
        $enrollment = TrainingEnrollment::findOrFail($id);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['Not Started', 'In Progress', 'Completed'])],
            'progress' => 'nullable|integer|min:0|max:100',
            'notes' => 'nullable|string',
            'score' => 'nullable|numeric|min:0|max:100'
        ]);

        // Auto-set completed_at when status changes to Completed
        if ($validated['status'] === 'Completed' && $enrollment->status !== 'Completed') {
            $validated['completed_at'] = now();
            $validated['progress'] = 100;
        }

        $enrollment->update($validated);

        $enrollment->load(['program:id,title', 'user:id,first_name,middle_name,last_name']);

        // Recompute and persist program status after enrollment changes
        if ($enrollment->program) {
            $program = TrainingProgram::find($enrollment->program_id);
            if ($program) {
                $newStatus = $this->computeProgramStatus($program);
                if ($program->status !== $newStatus) {
                    $program->status = $newStatus;
                    $program->save();
                }
            }
        }

        // Compute full name for the user
        if ($enrollment->user) {
            $enrollment->user->name = trim(implode(' ', array_filter([
                $enrollment->user->first_name,
                $enrollment->user->middle_name,
                $enrollment->user->last_name,
            ])));
        }

        return response()->json([
            'message' => 'Enrollment updated successfully',
            'enrollment' => $enrollment
        ]);
    }

    /**
     * Remove an enrollment.
     */
    public function unenroll($id): JsonResponse
    {
        $enrollment = TrainingEnrollment::findOrFail($id);
        $programId = $enrollment->program_id;
        $enrollment->delete();

        // Recompute and persist program status after unenroll
        if ($programId) {
            $program = TrainingProgram::find($programId);
            if ($program) {
                $newStatus = $this->computeProgramStatus($program);
                if ($program->status !== $newStatus) {
                    $program->status = $newStatus;
                    $program->save();
                }
            }
        }

        return response()->json([
            'message' => 'User unenrolled successfully'
        ]);
    }
}
