import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
export var useCounterStore = defineStore('counter', function () {
    var count = ref(0);
    var doubleCount = computed(function () { return count.value * 2; });
    function increment() {
        count.value++;
    }
    return { count: count, doubleCount: doubleCount, increment: increment };
});
