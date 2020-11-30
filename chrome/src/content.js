/* global chrome */

// function isElementVisible(el) {
//   const o = new IntersectionObserver(([entry]) => {
//     return entry.intersectionRatio === 1;
//   });
//   o.observe(el)
// }

// parse '(hh):mm:ss' string into seconds
const timeStringToSeconds = (str) => {
  return str.split(':').reverse().reduce((prev, curr, i) => prev + curr * Math.pow(60, i), 0)
}

const youtubeFields = () => {
  const currentTime = document.querySelector('.ytp-time-current').textContent
  const channelName = document.querySelector('.ytd-channel-name yt-formatted-string').textContent
  const channelUrl = document.querySelector('.ytd-channel-name yt-formatted-string a').href
  const publishedDate = document.querySelector('#date yt-formatted-string.ytd-video-primary-info-renderer').textContent.replace('Premiered ', '') // FIXME - this can break for other languages

  return ({
    current_time: currentTime,
    channel_name: channelName,
    channel_url: channelUrl,
    published_date: publishedDate
  })
}

const linkedinLearningFields = () => {
  const classTitle = document.querySelector('.classroom-nav__details h1').textContent
  const currentTime = document.querySelector('.vjs-current-time').textContent
  const teacherName = document.querySelector('.authors-entity__name-text').textContent.trim().split('\n')[0]
  const teacherUrl = document.querySelector('a.course-author-entity__lockup').getAttribute('href')
  const sessionTitle = document.querySelector('.classroom-toc-item--selected').textContent
  const sessionTranscript = document.querySelector('.transcripts-component__sections').textContent.trim()

  return ({
    class_title: classTitle.trim(),
    current_time: currentTime,
    teacher_name: teacherName.trim(),
    teacher_url: teacherUrl,
    session_title: sessionTitle.trim(),
    session_transcript: sessionTranscript
  })
}

const skillShareFields = () => {
  const classTitle = document.querySelector('.class-details-header-name').textContent
  const currentTime = document.querySelector('.vjs-current-time-display').textContent
  const teacherName = document.querySelector('.class-details-header-teacher-link').textContent
  const teacherUrl = document.querySelector('.class-details-header-teacher-link').getAttribute('href')
  const sessionTitle = document.querySelector('.session-item.active .session-item-title').textContent

  return ({
    class_title: classTitle.trim(),
    current_time: currentTime,
    teacher_name: teacherName.trim(),
    teacher_url: teacherUrl,
    session_title: sessionTitle.trim()
  })
}

const netflixFields = () => {
  const videoTitle = document.querySelector('.video-title h4').textContent
  const episodeTitle = document.querySelector('.video-title span').textContent
  const currentTime = document.querySelector('.scrubber-head').getAttribute('aria-valuetext')

  return ({
    video_title: videoTitle,
    episode_title: episodeTitle,
    current_time: currentTime
  })
}

const edxLectureFields = () => {
  const provider = document.querySelector('.course-header .provider').textContent
  const courseCode = document.querySelector('.course-header .course-number').textContent
  const courseName = document.querySelector('.course-header .course-name').textContent

  let videoUrl = document.querySelectorAll('.video-sources')
  videoUrl = videoUrl.length > 0 ? videoUrl[0].href : null

  let slidesUrl = document.querySelectorAll('a[href$=pdf]')
  slidesUrl = slidesUrl.length > 0 ? slidesUrl[0].href : null

  let vidTime = document.querySelectorAll('.vidtime')
  vidTime = vidTime.length > 0 ? vidTime.textContent.split('/')[0].trim() : null

  return ({
    course_provider: provider,
    course_code: courseCode,
    course_name: courseName,
    video_url: videoUrl,
    slides_url: slidesUrl,
    current_time: vidTime
  })
}

const archDailyFields = () => {
  let copyright
  let description = document.querySelector('.afd-gal-description')
  let url
  const pathname = window.location.pathname.replace(/^\//, '').split('/').filter((segment, index) => {
    if (index === 0) return segment.length > 2
    return segment.length > 0
  })
  const specItems = document.querySelectorAll('.afd-specs__item')
  const topics = []

  for (const item of specItems) {
    const key = item.querySelector('.afd-specs__key')
    const value = item.querySelector('.afd-specs__value')
    if (key && value) {
      topics.push({ topic: key.textContent.trim().replace(/:.*$/, ''), value: value.textContent.trim() })
    }
  }

  if (pathname.length >= 3) { // You're in a photo gallery
    const activeSlide = document.querySelector('.afd-gal-figure:not(.afd-hide)')
    if (activeSlide) {
      copyright = document.querySelector('.afd-gal-figcaption__link')
      url = activeSlide.querySelector('img').dataset.largesrc
    }
    description = description === null ? '' : description.textContent.trim()
    const articleURL = document.querySelector('a.afd-gal-close')
    if (articleURL) {
      topics.push({ topic: 'ArchDaily URL', value: articleURL.href })
    }
  } else { // You're on an article page
    const img = document.querySelector('.featured-image, .media-picture')
    if (img) {
      copyright = img.querySelector('figcaption')
      url = img.querySelector('img').src
    }
    topics.push({ topic: 'ArchDaily URL', value: window.location.href })
  }

  if (copyright) {
    copyright = copyright.textContent
    const copyrightPattern = new RegExp('(©)(.*)', 'i')
    const copyrightMatch = copyrightPattern.exec(copyright)
    if (copyrightMatch && copyrightMatch.length >= 2) {
      copyright = copyrightMatch[2]
    }
    topics.push({ topic: 'Copyright Holder', value: copyright })
  }

  return ({
    notes: description,
    topics: topics,
    url: url
  })
}

const houzzFields = () => {
  const topics = []
  let notes = null
  let url = null
  let image = document.querySelector('img.view-photo-image-pane__image')
  const description = document.querySelector('.hz-view-photo__space-info__description') || document.querySelector('.vp-redesign-description')
  if (description) {
    notes = description.textContent
  }
  if (image) {
    url = image.src
  } else {
    image = document.querySelector('.hz-page-content-wrapper--viewProduct img.zoom-pane-image')
    if (image && image.style.getPropertyValue('background-image')) {
      url = image.style.getPropertyValue('background-image').replace(/^url\("/, '').replace(/"\)$/, '')
    }
  }
  const productSpecs = document.querySelectorAll('dl .product-spec-item')
  for (const spec of productSpecs) {
    const key = spec.querySelector('dt')
    const value = spec.querySelector('dd')
    if (key && value) {
      topics.push({ topic: key.textContent.trim(), value: value.textContent.trim() })
    }
  }
  topics.push({ topic: 'Houzz URL', value: window.location.href })
  return ({
    notes: notes,
    topics: topics,
    url: url
  })
}

const pinterestPinFields = () => {
  let description = document.querySelector('.richPinInformation span')
  if (description) description = description.textContent
  let imageURL = document.querySelector('div[data-test-id="closeup-image"] img + div img')
  if (imageURL) {
    imageURL = imageURL.src
  }
  let pinnedBy = document.querySelector('.pinActivityContainer svg title, .pinActivityContainer img')
  if (pinnedBy) {
    pinnedBy = pinnedBy.alt || pinnedBy.textContent
  }
  let pinnedFrom = document.querySelector('a.linkModuleActionButton')
  if (pinnedFrom) pinnedFrom = pinnedFrom.href
  return ({
    notes: description,
    url: imageURL,
    topics: [
      { topic: 'Pin URL', value: window.location.href },
      { topic: 'Pinned By', value: pinnedBy },
      { topic: 'Pin Source URL', value: pinnedFrom }
    ]
  })
}

const isLinkedinLearningPage = () => {
  return window.location.href.startsWith('https://www.linkedin.com/learning/') && document.querySelectorAll('.classroom-layout__content').length > 0
}

const isSkillshareVideoPage = () => {
  return window.location.href.startsWith('https://www.skillshare.com/classes/')
}

const isNetflixVideoPage = () => {
  return window.location.href.startsWith('https://www.netflix.com/watch/')
}

const isYoutubeVideoPage = () => {
  return window.location.href.startsWith('https://www.youtube.com/watch?v=')
}

const isKindleCloudReaderPage = () => {
  return window.location.href.startsWith('https://read.amazon.com') && !window.location.href.includes('notebook')
}

const isKindleNotebookPage = () => {
  return window.location.href.startsWith('https://read.amazon.com/notebook')
}

const isEdxLecturePage = () => {
  return window.location.href.startsWith('https://courses.edx.org/courses/') && window.location.href.includes('courseware')
}

const isArchDailyPage = () => {
  return /archdaily.com(\.(br|cl|mx|cn))?$/.test(window.location.hostname) && /^\/((br|cl|mx|cn)\/)?\d+\//.test(window.location.pathname)
}

const isHouzzPage = () => {
  return /houzz.com$/.test(window.location.hostname)
}

const isPinterestPage = () => {
  return /pinterest.com$/.test(window.location.hostname) && /^\/pin\//.test(window.location.pathname)
}

const processPage = (customFields) => {
  let titleOverride = null
  let urlOverride = null
  // Youtube video
  if (isYoutubeVideoPage()) {
    const fields = youtubeFields()
    Object.assign(customFields, fields)

    // TODO - replace an existing parameter
    if (window.location.search.includes('t=')) {
      urlOverride = `${window.location.origin}${window.location.pathname}${window.location.search.replace(/t=[0-9]+s/, 't=' + timeStringToSeconds(fields.current_time) + 's')}`
    } else {
      urlOverride = `${window.location.href}&t=${timeStringToSeconds(fields.current_time)}`
    }
  }

  // Netflix Video
  if (isNetflixVideoPage()) {
    const fields = netflixFields()
    Object.assign(customFields, fields)
  }

  // Skillshare video
  if (isSkillshareVideoPage()) {
    const fields = skillShareFields()
    Object.assign(customFields, fields)
  }

  // Linkedin Learning
  if (isLinkedinLearningPage()) {
    const fields = linkedinLearningFields()
    Object.assign(customFields, fields)
  }

  // Kindle Cloud reader
  if (isKindleCloudReaderPage()) {
  }

  // Arch Daily
  if (isArchDailyPage()) {
    Object.assign(customFields, archDailyFields())
    titleOverride = document.querySelector('h1').textContent || null
  }

  // Houzz Page
  if (isHouzzPage()) {
    Object.assign(customFields, houzzFields())
    titleOverride = document.title || null
  }

  // Pinterest Pin
  if (isPinterestPage()) {
    Object.assign(customFields, pinterestPinFields())
    titleOverride = document.querySelector('h1').textContent || null
  }

  // Page title
  const h1 = document.querySelectorAll('h1')
  if (h1.length > 0) {
    customFields.page_title = h1[0].textContent.trim()
  }

  // edX
  if (isEdxLecturePage()) {
    Object.assign(customFields, edxLectureFields())
  }

  // if (isMedium)
  // Kindle Notes and Highlights: https://read.amazon.com/notebook
  // Go to the first book
  // $('.kp-notebook-library-each-book a.a-link-normal')[0].click()
  // document in the first kindle iframe
  // $('#KindleReaderIFrame').get(0).contentDocument
  if (isKindleNotebookPage()) {
    console.log('is kindle notebook page!')

    titleOverride = document.querySelector('h3').textContent
    customFields.page_title = titleOverride
    customFields.book_title = titleOverride
    customFields.book_author = document.querySelectorAll('p.kp-notebook-metadata')[1].textContent
  }
  return {
    customFields: customFields,
    titleOverride: titleOverride,
    urlOverride: urlOverride
  }
}

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    // console.log(request.message);

    // if (request.disconnect === true) {
    //   if (hasStoragePermission) {
    //     chrome.storage.local.clear()
    //     chrome.storage.local.remove('selectedElements')
    //   }
    // }

    if (request.message === 'save_to_dream_house' || request.message === 'clicked_browser_action') {
      // console.log('selectionText', selectionText)

      let titleOverride = null
      let urlOverride = null
      let customFields = {}

      const processedPage = processPage(customFields)
      customFields = processedPage.customFields
      titleOverride = processedPage.titleOverride
      urlOverride = processedPage.urlOverride || null

      if (request.message === 'save_to_dream_house') {
        Object.assign(customFields, { url: request.info.srcUrl })
      }

      const images = Array.from(document.querySelectorAll('img'))
        .filter(image => image.naturalHeight > 320 && image.naturalWidth > 320)
        .map(image => image.src)
      const pageContext = {
        pageContext: {
          urlOverride: urlOverride,
          titleOverride: titleOverride,
          // closestId: closestId,
          // page_dom: document.documentElement.outerHTML,
          customFields: customFields,
          images: images
        }
      }

      // console.log('sending pageContext', pageContext, window.getSelection().toString())

      chrome.runtime.sendMessage(pageContext, function (response) {
      })
    }
  }
)
