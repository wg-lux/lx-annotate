import { describe, test, expect, vi } from 'vitest';
import axiosInstance from '../../src/api/axiosInstance';
// Korrigierter Import für localSnakecaseKeys als benannter Export
import { localSnakecaseKeys, r, a } from '../../src/api/axiosInstance';
import Cookies from 'js-cookie';
describe('Response-Interceptor', () => {
    test('wandelt snake_case zu camelCase', async () => {
        const response = { data: { first_name: 'X', nested_obj: { inner_key: 'Y' } } };
        // Cast zu any, um auf die interne handlers-Eigenschaft zuzugreifen
        const result = await axiosInstance.interceptors.response.handlers[0].fulfilled(response);
        expect(result.data).toEqual({ firstName: 'X', nestedObj: { innerKey: 'Y' } });
    });
});
describe('localSnakecaseKeys', () => {
    test('wandelt Arrays von Objekten um', () => {
        const input = [{ firstName: 'A' }, { lastName: 'B' }];
        expect(localSnakecaseKeys(input, { deep: true }))
            .toEqual([{ first_name: 'A' }, { last_name: 'B' }]);
    });
    test('gibt Primitive unverändert zurück', () => {
        expect(localSnakecaseKeys(42)).toBe(42);
        expect(localSnakecaseKeys('string')).toBe('string');
    });
    test('sollte File-Objekte nicht verändern', () => {
        const file = new File(["content"], "test.txt", { type: "text/plain" });
        const input = { myFile: file, someData: "data" };
        const result = localSnakecaseKeys(input, { deep: true });
        expect(result.my_file).toBeInstanceOf(File);
        expect(result.my_file).toBe(file);
        expect(result.some_data).toBe("data");
    });
    test('sollte Blob-Objekte nicht verändern', () => {
        const blob = new Blob(["content"], { type: "text/plain" });
        const input = { myBlob: blob, otherInfo: 123 };
        const result = localSnakecaseKeys(input, { deep: true });
        expect(result.my_blob).toBeInstanceOf(Blob);
        expect(result.my_blob).toBe(blob);
        expect(result.other_info).toBe(123);
    });
});
describe('CSRF-Interceptor', () => {
    test('setzt X-CSRFToken, wenn Cookie existiert', async () => {
        vi.spyOn(Cookies, 'get').mockReturnValue({ 'X-CSRFToken': 'token123' });
        // Cast zu any, um auf die interne handlers-Eigenschaft zuzugreifen
        const config = await axiosInstance.interceptors.request.handlers[0].fulfilled({ headers: {} });
        expect(config.headers['X-CSRFToken']).toBe('token123');
    });
    test('lässt Header unverändert, wenn kein Cookie', async () => {
        vi.spyOn(Cookies, 'get').mockReturnValue(undefined);
        // Cast zu any, um auf die interne handlers-Eigenschaft zuzugreifen
        const config = await axiosInstance.interceptors.request.handlers[0].fulfilled({ headers: { foo: 'bar' } });
        expect(config.headers).toEqual({ foo: 'bar' });
    });
});
describe('URL-Helper r and a', () => {
    test('r adds PREFIX correctly', () => {
        // Stellen Sie sicher, dass VITE_API_PREFIX in Ihrer Testumgebung definiert ist oder mocken Sie import.meta.env
        const expectedPrefix = import.meta.env.VITE_API_PREFIX || 'api/';
        expect(r('users')).toBe(`${expectedPrefix}users`);
    });
    test('a adds pdf path correctly', () => {
        const expectedPrefix = import.meta.env.VITE_API_PREFIX || 'api/';
        expect(a('report')).toBe(`${expectedPrefix}pdf/report`);
    });
});
describe('vite base url, (VITE_BACKEND_URL)', () => {
    test('should be set to the correct value', () => {
        expect(import.meta.env.VITE_BACKEND_URL).toBe(axiosInstance.defaults.baseURL);
    });
});
describe('Snakecase conversion', () => {
    test('should convert camelCase to snake_case', () => {
        const input = {
            firstName: 'John',
            lastName: 'Doe',
            address: {
                streetAddress: '123 Main St',
                city: 'New York',
            },
        };
        const expectedOutput = {
            first_name: 'John',
            last_name: 'Doe',
            address: {
                street_address: '123 Main St',
                city: 'New York',
            },
        };
        const result = localSnakecaseKeys(input, { deep: true });
        expect(result).toEqual(expectedOutput);
    });
    test('should not modify non-object values', () => {
        const input = {
            name: 'Alice',
            age: 30,
            isStudent: false,
        };
        const expectedOutput = {
            name: 'Alice',
            age: 30,
            is_student: false,
        };
        const result = localSnakecaseKeys(input, { deep: true });
        expect(result).toEqual(expectedOutput);
    });
});
