declare const _default: __VLS_WithSlots<import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    title: StringConstructor;
    subtitle: StringConstructor;
    icon: StringConstructor;
    iconBgClass: {
        type: StringConstructor;
        default: string;
    };
    store: ObjectConstructor;
    isComplete: BooleanConstructor;
    isActive: BooleanConstructor;
    extraParams: ObjectConstructor;
    actionLabel: {
        type: StringConstructor;
        default: string;
    };
    showAction: {
        type: BooleanConstructor;
        default: boolean;
    };
    loading: BooleanConstructor;
}>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    title: StringConstructor;
    subtitle: StringConstructor;
    icon: StringConstructor;
    iconBgClass: {
        type: StringConstructor;
        default: string;
    };
    store: ObjectConstructor;
    isComplete: BooleanConstructor;
    isActive: BooleanConstructor;
    extraParams: ObjectConstructor;
    actionLabel: {
        type: StringConstructor;
        default: string;
    };
    showAction: {
        type: BooleanConstructor;
        default: boolean;
    };
    loading: BooleanConstructor;
}>> & Readonly<{}>, {
    loading: boolean;
    iconBgClass: string;
    isComplete: boolean;
    isActive: boolean;
    actionLabel: string;
    showAction: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>, {
    default?: ((props: {
        store: Record<string, any> | undefined;
        params: Record<string, any> | undefined;
    }) => any) | undefined;
}>;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
