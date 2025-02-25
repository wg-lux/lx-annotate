import axiosInstance from "./axiosInstance";

export const reportService = {
    
    async getCenters() {
            try {
            const response = await axiosInstance.get('centers/');
            this.centers = response.data;
            } catch (error) {
            console.error('Error getting centers:', error);
            }
        },
    async getExaminations() {
        console.log('getExaminations')
        try {
        const response = await axiosInstance.get('examinations/');
        this.examinations = response.data;
        console.log(this.examinations)
        } catch (error) {
        console.error('Error getting examinations:', error);
        }
    },
    async getFindings() {
        try {
        const response = await axiosInstance.get('findings/');
        this.findings = response.data;
        } catch (error) {
        console.error('Error getting findings:', error);
        }
    },
    async getLocationClassifications() {
        try {
        const response = await axiosInstance.get('location-classifications/');
        this.locationClassifications = response.data;
        } catch (error) {
        console.error('Error getting location classifications:', error);
        }
    },
    async getLocationClassificationChoices() {
        try {
        const response = await axiosInstance.get('location-classification-choices/');
        this.locationClassificationChoices = response.data;
        } catch (error) {
        console.error('Error getting location classification choices:', error);
        }
    },
    async getMorphologyClassifications() {
        try {
        const response = await axiosInstance.get('morphology-classifications/');
        this.morphologyClassifications = response.data;
        } catch (error) {
        console.error('Error getting morphology classifications:', error);
        }
    },
    async getMorphologyClassificationChoices() {
        try {
        const response = await axiosInstance.get('morphology-classification-choices/');
        this.morphologyClassificationChoices = response.data;
        } catch (error) {
        console.error('Error getting morphology classification choices:', error);
        }
    },
    async getInterventions() {
        try {
        const response = await axiosInstance.get('interventions/');
        this.interventions = response.data;
        } catch (error) {
        console.error('Error getting interventions:', error);
        }
    },

}