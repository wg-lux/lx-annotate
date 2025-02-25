<template>
    <div class="container-fluid py-4">
  
      <div class="row">
          <div class="col-12 bg-light">       
              <h1>Diagnostik Bild für Bild</h1>
          </div>
          <div class ="table-responsive">
          <table class="table table-striped table-hover">
          <thead>
            <tr>
              <th>Interessante Frames aus dem Video</th>
            </tr>
          </thead>
          <tr>
            <td>          
                <img :src = "staticUrl + '/img/frames_demo/frame1.jpg'">
            </td>
            <td>
                <div>
                    <h2>Schlechte Bildqualität</h2>
                    <div class="true">
                        <p>0.7</p>
                    </div>
                    <div>
                        <p>Das Bild ist unscharf, überbelichtet oder die Farben sind verwaschen. Es ist schwer zu erkennen, was auf dem Bild zu sehen ist.</p>
                    </div>
                </div>
            </td>
          </tr>
            <tr>
                <td>          
                    <img :src = "staticUrl + '/img/frames_demo/frame2.jpg'">
                </td>
                <td>
                    <div>
                        <h2>Greifer</h2>
                        <div class="false">
                            <p>0.3</p>
                        </div>
                        <p>Intervention findet statt</p>
                    </div>
                </td>
            </tr>

            <tr>
                <td>          
                    <img :src = "staticUrl + '/img/frames_demo/frame3.jpg'">
                </td>
                <td>
                    <div>
                        <h2>NBI</h2>
                        <div class="true">
                            <p>p=0.389</p>
                        </div>
                        <p>Narrow Bandwith Imaging wurde verwendet.</p>
                    </div>
                </td>
            </tr>
            <tr>
                <td>          
                    <img :src = "staticUrl + '/img/frames_demo/frame4.jpg'">
                </td>
                <td>
                    <div>
                        <h2>Ileum</h2>
                        <div class="false">
                            <p>0.3</p>
                        </div>
                        <p>Ileum erkannt.</p>
                    </div>
                </td>
            </tr>
        </table>

      </div>
    </div>
</div>


</template>
<script>

export default {
    name: 'Frames',
    data() {
        return {
            staticUrl: window.STATIC_URL || '/static/',
            frames: []
        }
    },
}

</script>

<style scoped>

.true {
    background-color: green;
}

.false {
    background-color: red;
}

</style>