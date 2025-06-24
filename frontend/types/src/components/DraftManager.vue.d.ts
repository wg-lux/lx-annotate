import type { AnnotationDraft } from '@/types/annotation';
interface Props {
    videoId: string;
}
declare const _default: import("vue").DefineComponent<Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    'save-draft': (draft: AnnotationDraft) => any;
    'delete-draft': (draftId: string | number) => any;
    'save-all-drafts': (drafts: AnnotationDraft[]) => any;
    'clear-all-drafts': () => any;
}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{
    "onSave-draft"?: ((draft: AnnotationDraft) => any) | undefined;
    "onDelete-draft"?: ((draftId: string | number) => any) | undefined;
    "onSave-all-drafts"?: ((drafts: AnnotationDraft[]) => any) | undefined;
    "onClear-all-drafts"?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, HTMLDivElement>;
export default _default;
