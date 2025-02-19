import axiosInstance from './axiosInstance';

export const patientService = {
  async getPatients() {
    try {
      const response = await axiosInstance.get('patients/');
      return response.data;
    } catch (error) {
      console.error('Error getting patients:', error);
      throw error;
    }
  },

  async addPatient(patientData) {
    try {
      const response = await axiosInstance.post('patients/', patientData);
      return response.data;
    } catch (error) {
      console.error('Error adding patient:', error);
      throw error;
    }
  },

  async updatePatient(patientId, patientData) {
    try {
      const response = await axiosInstance.put(`patients/${patientId}/`, patientData);
      return response.data;
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  },

  async deletePatient(patientId) {
    try {
      const response = await axiosInstance.delete(`patients/${patientId}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting patient:', error);
      throw error;
    }
  }
};
