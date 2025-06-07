PatientExamination;
{
    date_start: string;
    date_stop: string;
    examination_id: number;
    patient_id: number;
    report_file_id: number;
    video_file_id: number;
}
PatientFinding;
{
    -date_start
        - date_stop
        - examination_id
        - patient_id
        - report_file_id
        - video_file_id;
}
export {};
