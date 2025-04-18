import { describe, it } from 'vitest';
import { mount } from '@vue/test-utils';
import HelloWorld from '../HelloWorld.vue';
describe('HelloWorld', function () {
    it('renders properly', function () {
        var wrapper = mount(HelloWorld, { props: { msg: 'Hello Vitest' } });
    });
});
