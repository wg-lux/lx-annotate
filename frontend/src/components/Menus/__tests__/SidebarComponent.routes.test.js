import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import router from '@/router';
import SidebarComponent from '../SidebarComponent.vue';
const hoisted = vi.hoisted(() => ({
    get: vi.fn()
}));
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: hoisted.get
    },
    r: (path) => path
}));
function toPathValue(target) {
    if (typeof target === 'string')
        return target;
    if (!target || typeof target !== 'object')
        return null;
    const path = target.path;
    return typeof path === 'string' ? path : null;
}
async function getRouteImportError(path) {
    const resolved = router.resolve(path);
    if (resolved.matched.length === 0) {
        return `Route "${path}" wird vom Router nicht aufgelöst.`;
    }
    for (const record of resolved.matched) {
        const comp = record.components;
        const defaultComponent = comp?.default;
        if (!defaultComponent) {
            return `Route "${path}" hat keine Default-Komponente (record: "${record.path}").`;
        }
        if (typeof defaultComponent === 'function') {
            try {
                const moduleOrComponent = await defaultComponent();
                if (moduleOrComponent && typeof moduleOrComponent === 'object' && 'default' in moduleOrComponent) {
                    if (!moduleOrComponent.default) {
                        return `Route "${path}" lädt ein Modul ohne Default-Export (record: "${record.path}").`;
                    }
                }
                else {
                    if (!moduleOrComponent) {
                        return `Route "${path}" liefert leere Komponente (record: "${record.path}").`;
                    }
                }
            }
            catch (error) {
                const message = error?.message || String(error);
                return (`Route "${path}" konnte nicht geladen werden (record: "${record.path}"): ${message}`);
            }
        }
    }
    return null;
}
describe('Sidebar linked routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hoisted.get.mockResolvedValue({ data: [] });
        sessionStorage.clear();
    });
    afterEach(() => {
        vi.clearAllTimers();
    });
    it('deckt alle aktuell in der Sidebar verlinkten Seiten ab und kann deren Komponenten laden', async () => {
        const wrapper = mount(SidebarComponent, {
            global: {
                stubs: {
                    RouterLink: RouterLinkStub
                },
                directives: {
                    can: () => { }
                },
                mocks: {
                    $route: {
                        path: '/'
                    }
                }
            }
        });
        await flushPromises();
        const targets = wrapper
            .findAllComponents(RouterLinkStub)
            .map((link) => toPathValue(link.props('to')))
            .filter((path) => !!path);
        const linkedPaths = new Set(targets);
        const expectedSidebarPaths = new Set([
            '/',
            '/uebersicht',
            '/documentation',
            '/einstellungen',
            '/patienten',
            '/anonymisierung/uebersicht',
            '/anonymisierung/validierung',
            '/video-untersuchung',
            '/frame-annotation',
            '/model-training',
            '/reporting/case-setup',
            '/reporting',
            '/export',
            '/hub-export'
        ]);
        expect(linkedPaths).toEqual(expectedSidebarPaths);
        const errors = [];
        for (const path of linkedPaths) {
            const routeError = await getRouteImportError(path);
            if (routeError) {
                errors.push(routeError);
            }
        }
        expect(errors).toEqual([]);
        wrapper.unmount();
    });
    it('markiert Befundung: Übersicht als aktiv auf /reporting', async () => {
        const wrapper = mount(SidebarComponent, {
            global: {
                stubs: {
                    RouterLink: RouterLinkStub
                },
                directives: {
                    can: () => { }
                },
                mocks: {
                    $route: {
                        path: '/reporting'
                    }
                }
            }
        });
        await flushPromises();
        const reportingLink = wrapper
            .findAll('.nav-link')
            .find((node) => node.text().includes('Befundung: Übersicht'));
        expect(reportingLink).toBeTruthy();
        expect(reportingLink.classes()).toContain('active');
        const caseSetupLink = wrapper
            .findAll('.nav-link')
            .find((node) => node.text().includes('3. Befundung starten'));
        expect(caseSetupLink).toBeTruthy();
        expect(caseSetupLink.classes()).not.toContain('active');
        wrapper.unmount();
    });
    it('markiert 3. Befundung starten als aktiv auf /reporting/case-setup', async () => {
        const wrapper = mount(SidebarComponent, {
            global: {
                stubs: {
                    RouterLink: RouterLinkStub
                },
                directives: {
                    can: () => { }
                },
                mocks: {
                    $route: {
                        path: '/reporting/case-setup'
                    }
                }
            }
        });
        await flushPromises();
        const caseSetupLink = wrapper
            .findAll('.nav-link')
            .find((node) => node.text().includes('3. Befundung starten'));
        expect(caseSetupLink).toBeTruthy();
        expect(caseSetupLink.classes()).toContain('active');
        const reportingLink = wrapper
            .findAll('.nav-link')
            .find((node) => node.text().includes('Befundung: Übersicht'));
        expect(reportingLink).toBeTruthy();
        expect(reportingLink.classes()).toContain('active');
        wrapper.unmount();
    });
});
