declare const _default: import('vue').DefineComponent<
  {},
  {
    loading: import('vue').Ref<boolean, boolean>
    error: import('vue').Ref<null, null>
    currentItem: import('vue').Ref<null, null>
    editMode: import('vue').Ref<boolean, boolean>
    editedAnonymizedText: import('vue').Ref<string, string>
    editedPatient: {
      patient_first_name: string
      patient_last_name: string
      patient_gender: string
      patient_dob: string
      casenumber: string
    }
    examinationDate: import('vue').Ref<string, string>
    isExaminationDateValid: import('vue').ComputedRef<boolean>
    approveItem: () => Promise<void>
    rejectItem: () => Promise<void>
    skipItem: () => Promise<void>
    handleFileUpload: (event: any) => Promise<void>
    saveAnnotation: () => Promise<void>
    toggleImage: () => void
    displayedImageUrl: import('vue').ComputedRef<null>
    canSubmit: import('vue').ComputedRef<null>
  },
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {},
  string,
  import('vue').PublicProps,
  Readonly<{}> & Readonly<{}>,
  {},
  {},
  {},
  {},
  string,
  import('vue').ComponentProvideOptions,
  true,
  {},
  any
>
export default _default
