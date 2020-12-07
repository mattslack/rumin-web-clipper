/* global DHDModal, chrome */

(function () {
  let dhdmodal

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

    return {
      customFields: customFields,
      titleOverride: titleOverride
    }
  }

  const closeModal = () => {
    if (dhdmodal !== undefined) {
      dhdmodal.destroy()
      dhdmodal = undefined
    }
  }

  const openModal = (pageContext) => {
    const popover = new DHDModal(pageContext)
    popover.build()
    popover.populate()
    return popover
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

      if (request.message === 'save_session' && request.token) {
        chrome.storage.local.set({ token: request.token.access_token }, () => {
          sendResponse({ message: 'token_saved', token: request.token.access_token })
        })
      }
      if (request.message === 'close_modal') {
        closeModal()
      }
      if (request.message === 'clicked_browser_action') {
        if (dhdmodal === undefined || document.querySelector('#dhd-popover') === null) {
          chrome.storage.local.get(['token'], (item) => {
            const token = item.token
            console.log('stored token:', token)
            let titleOverride = null
            let urlOverride = null
            let customFields = {}

            const processedPage = processPage(customFields)
            customFields = processedPage.customFields
            titleOverride = processedPage.titleOverride
            urlOverride = processedPage.urlOverride || null

            const images = Array.from(document.querySelectorAll('img'))
              .filter(image => image.naturalHeight > 320 && image.naturalWidth > 320)
              .map(image => image.src)

            const pageContext = {
              token: token,
              urlOverride: urlOverride,
              titleOverride: titleOverride,
              // closestId: closestId,
              // page_dom: document.documentElement.outerHTML,
              customFields: customFields,
              images: images
            }

            // console.log('sending pageContext', pageContext, window.getSelection().toString())

            // chrome.runtime.sendMessage(pageContext, function (response) { })
            dhdmodal = openModal(pageContext)
          })
        } else {
          closeModal()
        }
      }
      // It's polite to send a response so the listener stops expecting one
      sendResponse()
    }
  )
})()
