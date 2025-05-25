export interface Case {
    id: number;
    patient_first_name: string;
    patient_last_name: string;
    patient_dob: string;
    imageAnnotations: [];
    videoAnnotations: [];
    anonymizationAnnotations: [];
    anonymizationStatus: string;
}
export interface Risk {
    coronaryStent: CoronaryStent[];
    valveReplacement: ValveReplacement[];
    thromboembolicEvent: ThromboembolicEvent[];
    atrialFibrillation: AtrialFibrillation[];
    diabetes: Diabetes[];
    hypertension: Hypertension[];
    stroke: Stroke[];
}
export interface PlateletInhibitionMonoMedication {
    id: number;
    name: string;
    category: string;
    indications: string[];
}
export interface PlateletInhibitionDualMedication {
    id: number;
    name: string;
    category: string;
    indications: string[];
}
export interface AnticoagulationMedication {
    id: number;
    name: string;
    category: string;
    indications: string[];
}
export interface MedicationInterface {
    plateletInhibitionMonoMedications: PlateletInhibitionMonoMedication[];
    plateletInhibitionDualMedications: PlateletInhibitionDualMedication[];
    anticoagulationMedications: AnticoagulationMedication[];
}
export interface CoronaryStent {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    drugEluted: boolean;
    older6Weeks: boolean;
    older12Months: boolean;
}
export interface ValveReplacement {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    type: ValveReplacementType[];
    location: ValveReplacementLocations[];
    possibleAnticoagulation: AnticoagulantIndication[];
}
export interface ValveReplacementType {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    id: number;
    artificial: boolean;
    biological: boolean;
}
export interface ValveReplacementLocations {
    aortic: boolean;
    mitral: boolean;
    tricuspid: boolean;
    pulmonary: boolean;
}
export interface AnticoagulantIndication {
    risk: Risk[];
    anticoagulationMedication: AnticoagulationMedication[];
}
export interface ThromboembolicEvent {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    pulmonary: boolean;
    older3Months: boolean;
    older6Months: boolean;
    older12Months: boolean;
    possibleAnticoagulation: AnticoagulantIndication[];
}
export interface AtrialFibrillation {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    congestiveHeartFailure: boolean;
    hypertension: boolean;
    ageOlder75: boolean;
    diabetes: boolean;
    stroke: boolean;
    possibleAnticoagulation: AnticoagulantIndication[];
}
export interface Diabetes {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    type: DiabetesType[];
}
export interface DiabetesType {
    type: string;
    insulin: boolean;
}
export interface Hypertension {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    type: HypertensionType[];
}
export interface HypertensionType {
    type: string;
    older3Months: boolean;
    older6Months: boolean;
    older12Months: boolean;
    possibleAnticoagulation: AnticoagulantIndication[];
}
export interface Stroke {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    ischemic: boolean;
    hemorrhagic: boolean;
    older3Months: boolean;
    older6Months: boolean;
    older12Months: boolean;
    possibleAnticoagulation: AnticoagulantIndication[];
}
export declare const useCasesStore: import("pinia").StoreDefinition<"cases", {}, {}, {}>;
