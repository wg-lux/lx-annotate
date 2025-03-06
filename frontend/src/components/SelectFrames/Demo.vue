<template>
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-12 bg-light mb-4">
        </div>
        <div class="col-12">
          <div class="table-responsive">
            <table class="table table-striped table-hover">
              <thead>
                <tr>
                  <th>Frame</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <img 
                      :src="staticUrl + '/img/frames_demo/frame1.jpg'" 
                      class="img-fluid" 
                      alt="Frame 1">
                  </td>
                  <td>
                    <h2 class="mb-1">Schlechte Bildqualität</h2>
                    <div class="text-success">
                      <p>0.7</p>
                    </div>
                    <p>Das Bild ist unscharf, überbelichtet oder die Farben sind verwaschen. Es ist schwer zu erkennen, was auf dem Bild zu sehen ist.</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <img 
                      :src="staticUrl + '/img/frames_demo/frame2.jpg'" 
                      class="img-fluid" 
                      alt="Frame 2">
                  </td>
                  <td>
                    <h2 class="mb-1">Greifer</h2>
                    <div class="text-danger">
                      <p>0.3</p>
                    </div>
                    <p>Intervention findet statt</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <img 
                      :src="staticUrl + '/img/frames_demo/frame3.jpg'" 
                      class="img-fluid" 
                      alt="Frame 3">
                  </td>
                  <td>
                    <h2 class="mb-1">NBI</h2>
                    <div class="text-success">
                      <p>p=0.389</p>
                    </div>
                    <p>Narrow Bandwith Imaging wurde verwendet.</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <img 
                      :src="staticUrl + '/img/frames_demo/frame4.jpg'" 
                      class="img-fluid" 
                      alt="Frame 4">
                  </td>
                  <td>
                    <h2 class="mb-1">Ileum</h2>
                    <div class="text-danger">
                      <p>0.3</p>
                    </div>
                    <p>Ileum erkannt.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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