/* global DHDModal, chrome */

(function () {
  let dhdmodal

  const archDailyFields = (fields) => {
    const images = []
    let description = document.querySelector('.afd-gal-description')
    description = description === null ? '' : description.textContent.trim()

    const specItems = document.querySelectorAll('.afd-specs__item')
    const topics = [
      { topic: 'ArchDaily URL', value: window.location.url }
    ]

    const processImage = (image) => {
      image = image.el
      const galleryFigure = image.closest('.afd-gal-figure')
      if (galleryFigure) {
        const alt = image.getAttribute('alt')
        let copyright
        if (/©/.test(alt)) {
          copyright = parseCopyright(alt)
          images.push({ el: image, topics: [copyright] })
        } else {
          images.push({ el: image })
        }
      } else {
        const figure = image.closest('.featured-image, .media-picture')
        let caption
        if (figure) {
          caption = figure.querySelector('figcaption')
          caption = caption === null ? '' : caption.textContent
          images.push({ el: image, topics: [parseCopyright(caption)] })
        }
      }
    }

    const parseCopyright = (copyright) => {
      const copyrightPattern = new RegExp('(©)(.*)', 'i')
      const copyrightMatch = copyrightPattern.exec(copyright)
      if (copyrightMatch && copyrightMatch.length >= 2) {
        copyright = copyrightMatch[2]
      }
      return { topic: 'Copyright Holder', value: copyright.trim() }
    }

    for (const item of specItems) {
      const key = item.querySelector('.afd-specs__key')
      const value = item.querySelector('.afd-specs__value')
      if (key && value) {
        topics.push({ topic: key.textContent.trim().replace(/:.*$/, ''), value: value.textContent.trim() })
      }
    }

    fields.images.forEach(processImage)

    return Object.assign(fields, {
      images: images,
      notes: description,
      topics: topics
    })
  }

  const houzzFields = (fields) => {
    const images = []
    fields.images.forEach(image => {
      image = image.el
      let notes = ''
      let title
      // Home feed Images
      if (image.closest('.hz-hf-card')) {
        const topics = [
          { topic: 'Source URL', value: window.location.href }
        ]
        title = image.closest('.hz-hf-card').querySelector('.hz-hf-card-details__title')
        if (title) {
          if (title.querySelector('a[href]')) topics.push({ topic: 'Houzz URL', value: title.querySelector('a').href })
          notes = title.querySelector('.hz-hf-card-info__subtitle') || ''
          if (notes.length) notes = notes.textContent
          if (title.textContent) title = title.textContent.trim()
        }
        images.push({
          el: image,
          notes: notes,
          title: title,
          topics: topics
        })
      }
    })

    /*
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
    */
    return Object.assign(fields, {
      images: images
    })
  }

  const pinterestPinFields = (fields) => {
    const images = []
    fields.images.forEach(image => {
      image = image.el
      if (image.closest('.Closeup')) {
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
        images.push({
          el: image,
          notes: description,
          topics: [
            { topic: 'Pin URL', value: window.location.href },
            { topic: 'Pinned By', value: pinnedBy },
            { topic: 'Pin Source URL', value: pinnedFrom }
          ]
        })
      } else {
        const wrapper = image.closest('[data-test-id="pinWrapper"]')
        if (wrapper) {
          const topics = []
          const alt = image.getAttribute('alt')
          let notes = ''
          if (alt && alt.length) notes = alt
          const link = wrapper.querySelector('a')
          if (link) topics.push({ topic: 'Pin URL', value: link.href })
          images.push({
            el: image,
            notes: notes,
            topics: topics
          })
        }
      }
    })

    return Object.assign(fields, {
      images: images
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
    const h1 = document.querySelectorAll('h1')

    // Page title
    if (h1.length > 0) {
      const pageTitle = h1[0].textContent.trim()
      if (pageTitle.length) {
        customFields.page_title = pageTitle
        titleOverride = pageTitle
      }
    }

    // Arch Daily
    if (isArchDailyPage()) {
      customFields = archDailyFields(customFields)
    }

    // Houzz Page
    if (isHouzzPage()) {
      customFields = houzzFields(customFields)
    }

    // Pinterest Pin
    if (isPinterestPage()) {
      customFields = pinterestPinFields(customFields)
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
        if (!(dhdmodal instanceof DHDModal) || document.querySelector('#dhd-popover') === null) {
          chrome.storage.local.get(['token'], (item) => {
            const token = item.token
            console.log('stored token:', token)
            const images = Array.from(document.querySelectorAll('img')).map(image => {
              return { el: image }
            })
            let titleOverride = null
            let urlOverride = null
            let customFields = {
              images: images
            }

            const processedPage = processPage(customFields)
            customFields = processedPage.customFields
            titleOverride = processedPage.titleOverride
            urlOverride = processedPage.urlOverride || null
            if (customFields.topics === undefined || customFields.topics.length === 0) {
              customFields.topics = [{ topic: 'Source URL', value: window.location.href }]
            }

            const pageContext = {
              token: token,
              urlOverride: urlOverride,
              titleOverride: titleOverride,
              // closestId: closestId,
              // page_dom: document.documentElement.outerHTML,
              customFields: customFields
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
