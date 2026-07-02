import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/components/Export/HubExportOverviewComponent.vue', () => ({
    default: {
        template: '<div data-test="hub-export-overview" />'
    }
}));
vi.mock('@/components/VideoExamination/VideoExaminationAnnotation.vue', () => ({
    default: {
        template: '<div data-test="video-examination-annotation" />'
    }
}));
vi.mock('@/components/Patients/PatientDashboard.vue', () => ({
    default: {
        template: '<div data-test="patient-dashboard" />'
    }
}));
vi.mock('@/components/Anonymizer/AnonymizationOverviewComponent.vue', () => ({
    default: {
        template: '<div data-test="anonymization-overview" />'
    }
}));
vi.mock('@/components/Anonymizer/AnonymizationMetricsComponent.vue', () => ({
    default: {
        template: '<div data-test="anonymization-metrics" />'
    }
}));
import HubExport from '../HubExport.vue';
import VideoExamination from '../VideoExamination.vue';
import PatientOverview from '../PatientOverview.vue';
import AnonymizationOverview from '../AnonymizationOverview.vue';
import AnonymizationMetrics from '../AnonymizationMetrics.vue';
describe('route wrapper views', () => {
    it('renders the hub export route shell', () => {
        const wrapper = mount(HubExport);
        expect(wrapper.find('[data-test="hub-export-overview"]').exists()).toBe(true);
    });
    it('renders the video examination route shell', () => {
        const wrapper = mount(VideoExamination);
        expect(wrapper.find('[data-test="video-examination-annotation"]').exists()).toBe(true);
    });
    it('renders the patient overview route shell', () => {
        const wrapper = mount(PatientOverview);
        expect(wrapper.find('[data-test="patient-dashboard"]').exists()).toBe(true);
    });
    it('renders the anonymization overview route shell', () => {
        const wrapper = mount(AnonymizationOverview);
        expect(wrapper.find('[data-test="anonymization-overview"]').exists()).toBe(true);
    });
    it('renders the anonymization metrics route shell', () => {
        const wrapper = mount(AnonymizationMetrics);
        expect(wrapper.find('[data-test="anonymization-metrics"]').exists()).toBe(true);
    });
});
