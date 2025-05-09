import {defineStore} from 'pinia';
import axios from 'axios';
import {useAnonymizationStore} from "@/stores/anonymizationStore";

export interface Case {
    patient_first_name: string;
    patient_last_name: string;
    patient_dob: string;
    imageAnnotations: [];
    videoAnnotations: [];
    anonymizationAnnotations: [];
    anonymizationStatus: string;
}