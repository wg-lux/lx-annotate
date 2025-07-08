describe('VideoExaminationAnnotation - Segment Annotations Integration', () => {
  beforeEach(() => {
    // Mock the stores and their dependencies
    cy.intercept('GET', '/api/videos/', { fixture: 'videos.json' }).as('getVideos')
    cy.intercept('GET', '/api/video-segments/*', { fixture: 'segments.json' }).as('getSegments')
    cy.intercept('POST', '/api/video-segments/', { fixture: 'newSegment.json' }).as('createSegment')
    cy.intercept('POST', '/api/annotations/', { fixture: 'newAnnotation.json' }).as('createAnnotation')
    
    // Visit the video examination page
    cy.visit('/video-examination?video=1')
  })

  it('should create both segment and annotation when drafting a segment', () => {
    // Wait for video to load
    cy.get('[data-cy="video-player"]', { timeout: 10000 }).should('be.visible')
    
    // Select a label
    cy.get('[data-cy="label-select"]').select('polyp')
    
    // Start segment creation
    cy.get('[data-cy="start-label-button"]').click()
    
    // Simulate video time progression
    cy.get('[data-cy="video-player"]').then(($video) => {
      const video = $video[0] as HTMLVideoElement
      video.currentTime = 10
      cy.wrap(video).trigger('timeupdate')
    })
    
    // End segment creation
    cy.get('[data-cy="finish-label-button"]').click()
    
    // Verify segment creation API call
    cy.wait('@createSegment').then((interception) => {
      expect(interception.request.body).to.include({
        video_file: 1,
        label: 3, // polyp label ID
        start_frame_number: 300, // 10s * 30fps
        end_frame_number: 300
      })
    })
    
    // Verify annotation creation API call
    cy.wait('@createAnnotation').then((interception) => {
      expect(interception.request.body).to.include({
        videoId: '1',
        type: 'segment',
        startTime: 10,
        endTime: 10,
        tags: ['polyp'],
        userId: 'user-1'
      })
      expect(interception.request.body.metadata).to.include({
        segmentId: 123,
        labelId: 3
      })
    })
    
    // Verify success message
    cy.get('[data-cy="toast-success"]').should('contain', 'Created annotation for segment')
  })

  it('should create examination annotation when saving examination', () => {
    // Wait for video and form to load
    cy.get('[data-cy="examination-form"]', { timeout: 10000 }).should('be.visible')
    
    // Fill out examination form
    cy.get('[data-cy="examination-type"]').select('colonoscopy')
    cy.get('[data-cy="examination-notes"]').type('Test examination notes')
    
    // Set video time
    cy.get('[data-cy="video-player"]').then(($video) => {
      const video = $video[0] as HTMLVideoElement
      video.currentTime = 30
      cy.wrap(video).trigger('timeupdate')
    })
    
    // Save examination
    cy.get('[data-cy="save-examination"]').click()
    
    // Verify annotation creation for examination
    cy.wait('@createAnnotation').then((interception) => {
      expect(interception.request.body).to.include({
        videoId: '1',
        type: 'classification',
        startTime: 30,
        endTime: 30,
        text: 'colonoscopy',
        tags: ['examination', 'colonoscopy'],
        userId: 'user-1'
      })
      expect(interception.request.body.metadata).to.include({
        examinationId: 456,
        examinationType: 'colonoscopy'
      })
    })
    
    // Verify examination appears in saved list
    cy.get('[data-cy="saved-examinations"]').should('contain', 'colonoscopy')
  })

  it('should sync annotations from videoStore on page load', () => {
    // Mock annotation store methods
    cy.window().then((win) => {
      const annotationStore = (win as any).useAnnotationStore()
      cy.stub(annotationStore, 'setCurrentVideoId').as('setCurrentVideoId')
      cy.stub(annotationStore, 'syncSegmentsFromVideoStore').as('syncSegments')
      cy.stub(annotationStore, 'loadAnnotations').as('loadAnnotations')
    })
    
    // Wait for video to load
    cy.wait('@getVideos')
    cy.wait('@getSegments')
    
    // Verify annotation store methods were called
    cy.get('@setCurrentVideoId').should('have.been.calledWith', '1')
    cy.get('@syncSegments').should('have.been.calledWith', '1')
    cy.get('@loadAnnotations').should('have.been.calledWith', '1')
  })

  it('should handle auth store initialization', () => {
    // Verify mock user is initialized
    cy.window().then((win) => {
      const authStore = (win as any).useAuthStore()
      expect(authStore.user).to.deep.include({
        id: 'user-1',
        username: 'doctor',
        email: 'doctor@hospital.com'
      })
    })
  })
})