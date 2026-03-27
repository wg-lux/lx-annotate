import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import LookupStatusPanel from '../LookupStatusPanel.vue';
describe('LookupStatusPanel', () => {
    it('is collapsible and hides details by default', async () => {
        const wrapper = mount(LookupStatusPanel, {
            props: {
                patientExaminationId: 42,
                lookupToken: 'lookup-token',
                sessionStatus: 'active'
            }
        });
        expect(wrapper.text()).toContain('Fall #42');
        expect(wrapper.find('[data-testid="lookup-status-details"]').exists()).toBe(false);
        await wrapper.get('[data-testid="lookup-status-toggle"]').trigger('click');
        expect(wrapper.find('[data-testid="lookup-status-details"]').exists()).toBe(true);
    });
    it('can be rendered non-collapsible', () => {
        const wrapper = mount(LookupStatusPanel, {
            props: {
                patientExaminationId: 7,
                collapsible: false
            }
        });
        expect(wrapper.find('[data-testid="lookup-status-toggle"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="lookup-status-details"]').exists()).toBe(true);
    });
});
