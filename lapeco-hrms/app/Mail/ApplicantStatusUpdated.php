<?php

namespace App\Mail;

use App\Models\Applicant;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ApplicantStatusUpdated extends Mailable
{
    use Queueable, SerializesModels;

    public Applicant $applicant;

    public function __construct(Applicant $applicant)
    {
        $this->applicant = $applicant;
    }

    public function build(): self
    {
        return $this
            ->subject('Application Status Update - Lapeco HRMS')
            ->view('emails.applicant.status_updated')
            ->with([
                'applicantName' => $this->applicant->full_name,
                'status' => $this->applicant->status,
                'notes' => $this->applicant->notes,
            ]);
    }
}
