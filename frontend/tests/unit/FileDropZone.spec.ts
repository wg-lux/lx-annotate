import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import FileDropZone from '@/components/common/FileDropZone.vue';

describe('FileDropZone.vue', () => {
  it('emits files-selected with correct payload when change event is fired', async () => {
    const wrapper = mount(FileDropZone);
    
    // Create mock files
    const mockFile1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' });
    const mockFile2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' });
    const mockFiles = [mockFile1, mockFile2];
    
    // Mock the FileList
    const mockFileList = {
      length: 2,
      item: (index: number) => mockFiles[index] || null,
      0: mockFile1,
      1: mockFile2,
      [Symbol.iterator]: function* () {
        for (let i = 0; i < this.length; i++) {
          yield this[i];
        }
      }
    } as FileList;
    
    // Get the hidden file input
    const fileInput = wrapper.find('input[type="file"]');
    
    // Mock the change event
    Object.defineProperty(fileInput.element, 'files', {
      value: mockFileList,
      writable: false,
    });
    
    // Trigger change event
    await fileInput.trigger('change');
    
    // Check that files-selected event was emitted with correct payload
    expect(wrapper.emitted('files-selected')).toBeTruthy();
    const emittedEvents = wrapper.emitted('files-selected') as Array<Array<File[]>>;
    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0][0]).toHaveLength(2);
    expect(emittedEvents[0][0][0].name).toBe('test1.pdf');
    expect(emittedEvents[0][0][1].name).toBe('test2.jpg');
  });

  it('shows validation error when no files are selected', async () => {
    const wrapper = mount(FileDropZone);
    
    // Call processFiles with empty array (simulating no files selected)
    const fileInput = wrapper.find('input[type="file"]');
    Object.defineProperty(fileInput.element, 'files', {
      value: { length: 0 } as FileList,
      writable: false,
    });
    
    await fileInput.trigger('change');
    
    // Should show validation error
    expect(wrapper.find('.alert-danger').exists()).toBe(true);
    expect(wrapper.find('.alert-danger').text()).toContain('Bitte Datei auswählen');
  });

  it('handles drag and drop events correctly', async () => {
    const wrapper = mount(FileDropZone);
    const dropZone = wrapper.find('.file-drop-zone');
    
    // Mock drag enter
    await dropZone.trigger('dragenter', {
      dataTransfer: { dropEffect: 'copy' }
    });
    
    // Should show drag over state
    expect(wrapper.vm.isDragOver).toBe(true);
    expect(dropZone.classes()).toContain('border-primary');
    
    // Mock drag leave
    await dropZone.trigger('dragleave');
    
    // Should hide drag over state
    expect(wrapper.vm.isDragOver).toBe(false);
  });

  it('triggers file input when clicked', async () => {
    const wrapper = mount(FileDropZone);
    const dropZone = wrapper.find('.file-drop-zone');
    const fileInput = wrapper.find('input[type="file"]');
    
    // Mock the click method
    const clickSpy = vi.spyOn(fileInput.element, 'click');
    
    // Click the drop zone
    await dropZone.trigger('click');
    
    // Should trigger file input click
    expect(clickSpy).toHaveBeenCalled();
  });

  it('triggers file input when Enter key is pressed', async () => {
    const wrapper = mount(FileDropZone);
    const dropZone = wrapper.find('.file-drop-zone');
    const fileInput = wrapper.find('input[type="file"]');
    
    // Mock the click method
    const clickSpy = vi.spyOn(fileInput.element, 'click');
    
    // Press Enter key
    await dropZone.trigger('keydown.enter');
    
    // Should trigger file input click
    expect(clickSpy).toHaveBeenCalled();
  });

  it('shows loading state when isUploading prop is true', async () => {
    const wrapper = mount(FileDropZone, {
      props: {
        isUploading: true
      }
    });
    
    // Should show loading indicator
    expect(wrapper.find('.spinner-border').exists()).toBe(true);
    expect(wrapper.text()).toContain('Datei wird hochgeladen');
  });
});