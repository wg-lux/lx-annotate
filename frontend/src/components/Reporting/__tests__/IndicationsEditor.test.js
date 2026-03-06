import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import IndicationsEditor from '../IndicationsEditor.vue';
describe('IndicationsEditor', () => {
    it('clears indication choice when switching to an indication without that choice', async () => {
        const wrapper = mount(IndicationsEditor, {
            props: {
                rows: [{ examinationIndicationId: 1, indicationChoiceId: 10 }],
                indicationOptions: [
                    {
                        id: 1,
                        label: 'Screening',
                        choices: [{ id: 10, label: 'Routine' }]
                    },
                    {
                        id: 2,
                        label: 'Kontrolle',
                        choices: []
                    }
                ]
            }
        });
        const selects = wrapper.findAll('select');
        await selects[0].setValue('2');
        const events = wrapper.emitted('update-row');
        expect(events).toBeTruthy();
        expect(events?.[0]).toEqual([0, { examinationIndicationId: 2, indicationChoiceId: null }]);
    });
    it('renders unknown persisted ids as synthetic dropdown options', () => {
        const wrapper = mount(IndicationsEditor, {
            props: {
                rows: [{ examinationIndicationId: 77, indicationChoiceId: 88 }],
                indicationOptions: []
            }
        });
        const selects = wrapper.findAll('select');
        expect(selects[0].text()).toContain('Unbekannte Indikation (#77)');
        expect(selects[1].text()).toContain('Unbekannte Auswahl (#88)');
    });
    it('emits refresh-options when no backend options are available', async () => {
        const wrapper = mount(IndicationsEditor, {
            props: {
                rows: [{ examinationIndicationId: null, indicationChoiceId: null }],
                indicationOptions: []
            }
        });
        const refreshButton = wrapper
            .findAll('button')
            .find((button) => button.text().includes('Optionen laden'));
        expect(refreshButton).toBeTruthy();
        await refreshButton.trigger('click');
        expect(wrapper.emitted('refresh-options')).toHaveLength(1);
    });
});
