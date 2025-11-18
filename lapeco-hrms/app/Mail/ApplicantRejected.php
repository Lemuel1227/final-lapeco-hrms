<?php

namespace App\Mail;

use App\Models\Applicant;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ApplicantRejected extends Mailable
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
            ->subject('Application Rejected - Lapeco HRMS')
            ->view('emails.applicant.rejected')
            ->with([
                'applicantName' => $this->applicant->full_name,
                'notes' => $this->applicant->notes,
            ]);
    }
}
