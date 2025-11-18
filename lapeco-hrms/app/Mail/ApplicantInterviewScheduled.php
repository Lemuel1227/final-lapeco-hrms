<?php

namespace App\Mail;

use App\Models\Applicant;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ApplicantInterviewScheduled extends Mailable
{
    use Queueable, SerializesModels;

    public Applicant $applicant;

    /**
     * @var array<string, mixed>
     */
    public array $interviewSchedule;

    public function __construct(Applicant $applicant, array $interviewSchedule)
    {
        $this->applicant = $applicant;
        $this->interviewSchedule = $interviewSchedule;
    }

    public function build(): self
    {
        return $this
            ->subject('Interview Scheduled - Lapeco HRMS')
            ->view('emails.applicant.interview_scheduled')
            ->with([
                'applicantName' => $this->applicant->full_name,
                'interviewDate' => $this->formatDate($this->interviewSchedule['date'] ?? null),
                'interviewTime' => $this->formatTime($this->interviewSchedule['time'] ?? null),
                'interviewer' => $this->interviewSchedule['interviewer'] ?? null,
                'location' => $this->interviewSchedule['location'] ?? null,
                'notes' => $this->interviewSchedule['notes'] ?? null,
            ]);
    }

    private function formatDate(?string $date): ?string
    {
        if (empty($date)) {
            return null;
        }

        try {
            return Carbon::parse($date)->format('F j, Y');
        } catch (\Throwable $exception) {
            return $date;
        }
    }

    private function formatTime(?string $time): ?string
    {
        if (empty($time)) {
            return null;
        }

        try {
            return Carbon::parse($time)->format('g:i A');
        } catch (\Throwable $exception) {
            return $time;
        }
    }
}
