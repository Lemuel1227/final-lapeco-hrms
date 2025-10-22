<?php

namespace App\Mail;

use App\Models\Applicant;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class ApplicantApplicationReceived extends Mailable
{
    use Queueable, SerializesModels;

    public Applicant $applicant;

    public function __construct(Applicant $applicant)
    {
        $this->applicant = $applicant;
    }

    public function build(): self
    {
        $applicationDate = $this->applicant->application_date
            ? Carbon::parse($this->applicant->application_date)->format('F j, Y')
            : Carbon::now()->format('F j, Y');

        return $this
            ->subject('Application Received - Lapeco HRMS')
            ->view('emails.applicant.application_received')
            ->with([
                'applicantName' => $this->applicant->full_name,
                'applicationDate' => $applicationDate,
            ]);
    }
}
