;(function (root, factory) {
    const pluginName = 'flickrGallerySlider';
    if (typeof define === 'function' && define.amd) {
        define([], factory(pluginName));
    } else if (typeof exports === 'object') {
        module.exports = factory(pluginName);
    } else {
        root[pluginName] = factory(pluginName);
    }
}((window || module || {}), function (pluginName) {
    // Use strict mode
    'use strict';

    let defaults = {
        baseUrl: 'https://api.flickr.com/services/rest/?method=',
        apiKey: 'd730e1b0b485148747900002e7da1d08',
        tags: "cats",
        gallerySelector: '.flicker-gallery',
        animationSpeed: 250,
        thumb: true,
        navigation: true,
        perPage: 15,
        slideNumber: 0,
        preload: {
            range: 2 // number or false to disable
        },
        classToAdd: "fg",
        classToComplete: "fg-ready",
        selectors: {
            galleryList: 'fg-galley-list',
            galleryItem: 'fg-galley-item',
            active: 'fg-active',
            galleryPreviousItem: 'fg-item-prev',
            galleryNextItem: 'fg-item-next',
            collapsedItem: 'fg-collapsed',
            galleryImage: 'fg-picture',
            navListClass: 'fg-nav-list',
            navItemClass: 'fg-nav-item',
            navActiveItem: 'fg-nav-item-active',
            navImage: 'fg-nav-image',
            prevBtn: 'fg-btn-prev',
            nextBtn: 'fg-btn-next',
            btnDisabled: 'fg-btn-disabled'
        }
    };


    let gallery = function () {
        return {
            state: {
                currentSlide: 1,
                galleryNode: null,
                galleryList: null,
                page: 1
            },
            /**
             * Image URL docs https://www.flickr.com/services/api/misc.urls.html
             * @param {Object} photo Flickr Image object
             * @param {String} size_suffix: "_b" or "_s" or others supported
             * @return {String} url
             */
            _imageUrl: function (photo, size_suffix) {
                return "https://farm"
                    + photo.farm
                    + ".staticflickr.com/"
                    + photo.server
                    + "/"
                    + photo.id
                    + "_"
                    + photo.secret
                    + size_suffix
                    + ".jpg";
            },

            /**
             * Generate gallery Url
             * @param {String} tags
             * @return {String} url
             */
            _galleryUrl: function (tags) {
                return this.options.baseUrl
                    + 'flickr.photos.search'
                    + '&api_key='
                    + this.options.apiKey
                    + '&tags='
                    + tags
                    + '&per_page='
                    + this.options.perPage
                    + '&page='
                    + this.state.page
                    + '&format=json'
                    + '&nojsoncallback=1';
            },

            /**
             * Get gallery Image list array
             * @param {String} gallery_url
             * @return {Promise} with array of image objects {image:"",thumb:"",title,""}
             */

            _galleryData: function (gallery_url) {
                let self = this;
                return fetch(gallery_url)
                    .then(function (response) {
                        return response.json();
                    })
                    .then(function (data) {
                        console.log(data);
                        let imageList = [];
                        for (let i = 0; i < data.photos.photo.length; i++) {
                            imageList.push({
                                image: self._imageUrl(data.photos.photo[i], "_b"),
                                thumb: self._imageUrl(data.photos.photo[i], "_s"),
                                title: data.photos.photo[i].title
                            });
                        }
                        return imageList;
                    })
                    .catch(function (e) {
                        console.log('Network error' + e);
                    });
            },

            /**
             * Prepare HTML
             * @param {Array} imageList
             */
            _prepareInnerHtml: function (galleryNode, imageList) {
                // @formatter:off
            let gallery = '',
                images = '<li class="fg-galley-item fg-item-prev fg-blanc"></li>',
                navigation = '',
                thumbs = '',
                lazyLoad ='',
                extraClass ='';

            for (let i = 0; i < imageList.length; i++) {
                switch(i) {
                    case 0:
                        // First visible frame
                        extraClass ='fg-active';
                        lazyLoad ='';
                        break;
                    case 1:
                        // Next prepared frame
                        extraClass ='fg-item-next';
                        lazyLoad ='';
                        break;
                    default:
                        extraClass ='fg-collapsed';
                        lazyLoad ='loading="lazy"';
                }

                // Image list HTML
                images+= '<li class="fg-galley-item ' + extraClass +'" data-tile ="'+ imageList[i].title +'">' +
                    '<img class="fg-picture" src="' + imageList[i].image + '" alt="'+ imageList[i].title + '"' + lazyLoad + '>'+
                    '</li>';

                // Thumbnail list HTML
                if ( this.options.thumb === true &&  this.options.navigation === true){
                    switch(i) {
                        case 0:
                            // First visible frame
                            extraClass ='fg-active';
                            break;
                        default:
                            extraClass ='';
                    }
                    thumbs+= '<li class="fg-nav-item">' +
                        '<img class="fg-nav-image '+ extraClass +'" src="' + imageList[i].thumb + '" alt="'+ imageList[i].title + '" loading="lazy" >'+
                        '</li>';
                }
            }

            thumbs = '<ul class="fg-nav-list">' + thumbs + '</ul>';
            if ( this.options.navigation === true){
                navigation = '<span class="fg-btn-prev fn-btn-disabled"></span>' +
                    '<span class="fg-btn-next"></span>' +
                    '<div class="fg-nav-wrapper">' +
                    thumbs +
                    '</div>';
            }

            gallery = '<div class="fg-galley-wrapper">' +
                '<ul class="fg-galley-list">' +
                images +
                '</ul>' +
                '</div>' +
                navigation;
            // @formatter:on

                galleryNode.innerHTML = gallery;
            },

            /**
             * Animate thumb list movement, done for position change
             * @param {Element} elem Dom Element object
             * @param {Number} destinationSlide
             */
            _slideThumbs: function (elem, destinationSlide) {
                elem.style.left = (destinationSlide * 100) + '%';
                return destinationSlide;
            },

            /**
             * Animate gallery list movement
             * @param {Element} galleryElem Dom Element object
             * @param {Number} destinationSlide
             */
            _slideGallery: function (galleryNode, destinationSlide) {
                let selector = this.options.selectors,
                    galleryList = galleryNode.querySelectorAll("." + selector.galleryItem),
                    oldPrevious = galleryList[this.state.currentSlide - 1],
                    oldNext = galleryList[this.state.currentSlide + 1],
                    oldActive = galleryList[this.state.currentSlide],

                    newPrevious = galleryList[destinationSlide - 1],
                    newNext = galleryList[destinationSlide + 1],
                    newActive = galleryList[destinationSlide];


                if (destinationSlide < 1) {
                    this.state.currentSlide = 1;
                    return 1;
                }

                // Clean Previous structure
                oldPrevious.replaceClass(selector.galleryPreviousItem,selector.collapsedItem);
                oldNext.replaceClass(selector.galleryNextItem,selector.collapsedItem);
                oldActive.replaceClass(selector.active,selector.collapsedItem);

                //Build new structure

                newPrevious.replaceClass(selector.collapsedItem,selector.galleryPreviousItem);
                newNext.replaceClass(selector.collapsedItem,selector.galleryNextItem);
                newActive.replaceClass(selector.collapsedItem,selector.active);

                this.state.currentSlide = destinationSlide;
                return destinationSlide;
            },

            /**
             * Bind Events
             */
            _bindEvents: function (galleryNode) {
                let self = this;
                galleryNode.addEventListener('click', function (e) {
                    if (hasClass(e.target, 'fg-btn-prev')) {
                        console.log("Previous step");
                        self._slideGallery(galleryNode, self.state.currentSlide - 1);
                    } else if (hasClass(e.target, 'fg-btn-next')) {
                        console.log("Next step");
                        self._slideGallery(galleryNode, self.state.currentSlide + 1);
                    }
                }, false);
            },

            /**
             * Prepare gallery
             */
            _createGallery: function (element) {
                let self = this;
                //console.log("Scoped var= " + attached);
                // Load data and build HTML
                self._galleryData(self._galleryUrl(self.options.tags))
                    .then(images => {
                        console.log(element);
                        let galleryNode = element;
                        self.state.galleryNode = element;
                        self.options.galleryNode = element;
                        console.log(self);
                        // Decoration class
                        galleryNode.classList.add(this.options.classToAdd);


                        self.options.slideNumber = images.length;
                        self._prepareInnerHtml(galleryNode, images);
                        self.state.galleryList = galleryNode.querySelectorAll("." + self.options.selectors.galleryList);
                        //Complete Decoration class
                        galleryNode.classList.add(this.options.classToComplete);

                        //Bind active elements events
                        self._bindEvents(galleryNode);
                    });
            }
        };
    };


    /**
     * Merge defaults with user options
     * @param {Object} target Default settings
     * @param {Object} options User options
     */
    const extend = function (target, options) {
        let prop, extended = {};
        for (prop in defaults) {
            if (Object.prototype.hasOwnProperty.call(defaults, prop)) {
                extended[prop] = defaults[prop];
            }
        }
        for (prop in options) {
            if (Object.prototype.hasOwnProperty.call(options, prop)) {
                extended[prop] = options[prop];
            }
        }
        return extended;
    };

    /**
     * Helper to check class name
     * @param {Element} elem Dom Element object
     * @param {String} className
     * @private
     */
    const hasClass = function (elem, className) {
        return elem.className.split(' ').indexOf(className) > -1;
    };

    /**
     * Helper to add class name
     * @private
     */
    Element.prototype.replaceClass =  function (removeClass, addClass) {
        this.classList.remove(removeClass);
        this.classList.add(addClass);
        return this;
    };

    /**
     * Helper to add class name
     * @private
     */
    Element.prototype.addClas =  function (addClass) {
        this.classList.add(addClass);
        return this;
    };

    /**
     * Helper to remove class name
     * @private
     */
    Element.prototype.removeClass =  function (removeClass) {
        this.classList.remove(removeClass);
        return this;
    };

    /**
     * Plugin Object
     * @param {Object} options User options
     * @constructor
     */
    function Plugin(options) {
        this.options = extend(defaults, options);
        this.init(); // Initialization Code Here
    }

    /**
     * Plugin prototype
     * @public
     * @constructor
     */
    Plugin.prototype = {
        init: function () {
            let self = this;
            // find all matching DOM elements.
            // makes `.selectors` object available to instance.
            document.querySelectorAll(self.options.gallerySelector).forEach(function (element) {
                let newGallery = Object.assign(new gallery, {options: self.options});
                console.log(newGallery);
                newGallery.state.galleryNode = element;
                newGallery._createGallery(element);
                //console.log(newGallery)
            });
        },

        // #! init
        destroy: function () {
            // Remove any event listeners and undo any "init" actions here...
        },
        doSomething: function (someData) {
            console.log(someData);
        } // #! doSomething
    };
    return Plugin;
}));


/**************
 EXAMPLE:
 **************/

//// create new Plugin instance
// let flickrGallery = new flickrGallerySlider({
//     gallerySelector: ".my-gallery",
//     apiKey: "d730e1b0b485148747900002e7da1d08",
//     tags: 'dogs'
// })

//// access public plugin methods
// flickrGallery.publicMethod("Doing Something")
