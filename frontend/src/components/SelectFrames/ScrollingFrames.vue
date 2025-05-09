<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12 bg-light mb-4">
        <div class="overflow-auto" style="max-height: 80vh;">
          <DynamicScroller :items="frames" :min-item-size="150" key-field="id" v-slot="{ item }">
            <DynamicScrollerItem :item="item">
              <div class="frame-item">
                <img :src="item.imageUrl" alt="Frame" class="img-fluid">
                <button 
                  class="btn btn-primary btn-sm mt-2"
                  @click="annotateFrame(item)"
                >
                  Annotieren
                </button>
              </div>
            </DynamicScrollerItem>
          </DynamicScroller>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useImageStore } from '@/stores/imageStore';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import { ref } from 'vue';
import { useVideoStore } from '@/stores/videoStore';
export default {
  name: 'ScrollingFrames',
  setup() {
    const imageStore = useImageStore();
    const frames = imageStore.data;


    const annotateFrame = (frame) => {
      alert(`Frame ${frame.id} annotiert!`);
    };

    return {
      frames,
      annotateFrame,
    };
  },
};
</script>

<style scoped>
.frame-item {
  margin-bottom: 10px;
  text-align: center;
}

.true {
  background-color: green;
}

.false {
  background-color: red;
}
</style>