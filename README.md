# Hazaar Forms

The Hazaar Forms module is able to simplify building advanced dynamic online forms.

More details will be coming soon.  For now here's a quick overview of using the forms.

## Form Definitions

Form definitions are just that.  They are JSON that defines the fields on your form and how the form will opperate.  This includes pages, sections, fields, validation and so forth.

### Prepare Your App

There is a new application sub-directory in use now called 'forms'.  So create the directory `{project_base}\application\forms` to store your form definitions.

### Create a simple form definition

Here's one to get you started.  Documentation will come soon.

```json
{
  "name": "Testing and Development Form #1",
  "pages": [
    {
      "sections": [
        {
          "label": "General Information",
          "fields": [
            {
              "name": "name",
              "required": true
            },
            "gender",
            "dob",
            "married"
          ]
        }
      ]
    },
    {
      "label": "Addresses",
      "sections": [
        {
          "label": "Home",
          "fields": [ "address1", "address2", "city", "country", "state" ]
        }
      ]
    }
  ],
  "fields": {
    "name": {
      "type": "text",
      "label": "Name",
      "placeholder": "Type your full name here...",
      "prefix": "Prefix",
      "suffix": "Suffix"
    },
    "gender": {
      "type": "select",
      "label": "Gender",
      "placeholder": "Please choose your gender...",
      "options": {
        "male": "Male",
        "female": "Female"
      }
    },
    "dob": {
      "type": "date",
      "label": "Date of Birth"
    },
    "country": {
      "type": "select",
      "label": "Country",
      "options": {
        "aus": "Australia",
        "nz": "New Zealand"
      }
    },
    "address1": {
      "type": "text",
      "label": "Address 1"
    },
    "address2": {
      "type": "text",
      "label": "Address 2"
    },
    "city": {
      "type": "text",
      "label": "City / Suburb"
    },
    "state": {
      "type": "select",
      "label": "State",
      "options": {
        "nsw": "New South Wales",
        "act": "Australian Captial Territory"
      }
    },
    "married": {
      "type": "boolean",
      "label": "Married"
    }
  }
}

```

There are currently only 3 required elements. `name`, `pages` and `fields`.  

* name - This is just a friendly label that can be displayed on the form layout
* pages - The actual pages definition.  Each page contains one or more sections.  Each section contains one or more fields.  Fields are included either by just name, or by an object declaration.
* fields - Defines all the fields available in your form.  Fields can be defined once and used multiple times through your form.  Field definitions have a name, type, label and some type dependent attributes.

## Forms Controller

Your application will need to have a forms controller to handle data communication with the form frontend.  The `Hazaar\Controller\Forms` class is used for that and is basically just a `Hazaar\Controller\Action` class that you use every day, but with a few extra helpful methods to get data in and out of your form.

Here's one I prepared earlier:

```php
<?php

class IndexController extends \Hazaar\Controller\Form {

    private $cache;

    /*
     * Initialise all the bits we need.  We call these in init so that they are
     * only called in a single place.  The cache object is used to store form 
     * data for this test.  The form() method call is required to declare which
     * form definition we are going to use.
     */
    protected function init() {

        $this->cache = new \Hazaar\Cache('file', array('use_pragma' => false));

        $this->form('test1', array('id' => intval($this->request->get('id', 1))));

    }

    /*
     * This is just like any other action defined in \Hazaar\Controller\Action
     * Here we add the GUI view helper, which gives us a cool popup box to use,
     * include out application.js script and set the view to use.
     */
    public function index() {

        $this->view->addHelper('gui');

        $this->view->requires('application.js');

        $this->view('index');

    }

    /*
     * This is a simple example of a save method.  Here all we do is take the
     * form data and dump it into a cache object.  A more advanced use would
     * be to process the form data and store it in a database
     *
     * $params is the second argument from out forms() call in the init() 
     * method.  This can be used to pass on a unique ID to identify the form
     * data.
     */
    public function save($model, $params = array()){

        $this->cache->set('form-' . ake($params, 'id', 0), $model->get());

    }

    /*
     * The load method is basically the reverse of the save method.  In this
     * example we from the form data out of the cache object.  If it doesn't
     * exist we are nice and return an empty array.
     */
    public function load($params = array()){

        if(!($out = $this->cache->get('form-' . ake($params, 'id', 0))))
            $out = array();

        return $out;

    }
}
```

Things to note: 

* `init()` and `dex()` are defined in the Action class so work just the same as normal.
* `save()` and``load()` are simple methods that are required.  These methods get data in and out of the form module and allow your application to store and retrieve the actual form data anywhere it wants.  In this example we just cache it to a file.
* The call to `$this->form('formname')` is REQUIRED.  This is usually done in the init method, although this may change, and simply tells the forms module which form we are using.  It also gives your application a chance to define some extra parameters that will be sent back and forth with each GET/POST call.  This would normally be used for a record ID or some form data identifier.

Now all we need is a view and things will work, but will add some JavaScript to get everything working.

## Forms View

The view itself can be pretty minimal.  However to get the best out of our forms we can bind DOM elements to our form data and have it updated dynamically.

```php
<div class="row">
    <div class="col-xs-9">
        <div class="panel panel-default">
            <div class="panel-heading">
                <div id="formPage" class="pull-right"></div>
                <div id="formStatus">Initialising...</div>
            </div>
            <div class="panel-body" style="position: relative;">
                <div class="well" id="frmTest">
                    <?=$this->layout();?>
                </div>
            </div>
            <div class="panel-footer">
                <button id="btnPrev" class="btn btn-default">Previous</button>
                <button id="btnNext" class="btn btn-default pull-right">Continue</button>
            </div>
        </div>
    </div>
    <div class="col-xs-3">
        <div class="panel panel-default">
            <div class="panel-heading">
                <div id="formStatus">Summary</div>
            </div>
            <div class="panel-body">
                <div class="form-group">
                    <label class="control-label">Name</label>
                    <div data-bind="name"></div>
                </div>
                <div class="form-group">
                    <label class="control-label">Gender</label>
                    <div data-bind="gender"></div>
                </div>
                <div class="form-group">
                    <label class="control-label">DOB</label>
                    <div data-bind="dob"></div>
                </div>
            </div>
        </div>
        <div id="saveButtons">
            <button class="btn btn-default">Save</button>
            <button class="btn btn-success" data-submit="true">Submit</button>
        </div>
    </div>
</div>
```

Really the only important bit here is the call to `$this->layout()` which actually tells the forms controller where to put the form.

## Extra JavaScript

To navigate the form, we need to add an extra bit of JavaScript.  It was decided that having built-in navigation, while making things self-contained, wouldn't allow for very good view integration.

```javascript
$(document).ready(function () {
    $('#frmTest').children('form').on('ready', function (e, def) {
        $('#formStatus').html(def.name);
    }).on('nav', function (e, page, pages) {
        $('#formPage').html('Page ' + page + ' of ' + pages);
    }).on('data', function (e, data) {
        //Data is loaded so do stuff!
    }).on('saved', function (e, data) {
        var popupOps = { title: "Success", icon: "success", buttons: [{ label: 'OK', "class": "btn btn-default" }] };
        if (data.submit === true)
            $('<div>').html('Form data has been submitted successfully!').popup(popupOps);
        else
            $('<div>').html('Form data has been saved successfully!').popup(popupOps);
    }).on('error', function (e, error) {
        $('<div>').html([
            $('<div>').html(error.str),
            $('<div>').html([$('<strong>').html('Line: '), $('<span>').html(error.line)]),
            $('<div>').html([$('<strong>').html('File: '), $('<span>').html(error.file)])
        ]).popup({ title: 'Form error', buttons: [{ label: 'OK', "class": "btn btn-default" }], icon: 'error' });
    });
    $('#btnPrev').click(function () {
        $('#frmTest').children('form').form('prev');
    });
    $('#btnNext').click(function () {
        $('#frmTest').children('form').form('next');
    });
    $('#saveButtons').children('button').click(function (e) {
        var submit = ($(e.target).attr('data-submit') == 'true');
        if ($(e.target).attr('data-submit') == 'true') {
            $('<div>').html('Are you sure you want to submit this form?').popup({
                title: "Confirm Submission",
                icon: "question",
                buttons: [
                    {
                        "label": "OK",
                        "class": "btn btn-success",
                        "action": function () {
                            $('#frmTest').children('form').form('save', false, { submit: true });
                            $(this).popup('close');
                        }
                    },
                    {
                        "label": "Cancel",
                        "class": "btn btn-default"
                    }
                ]
            });
        } else {
            $('#frmTest').children('form').form('save', false);
        }
    });
});
```

This bit of code will handle the click events on a couple of buttons that allow us to save and submit a form.  Save is the default method, while submit pops up a confirmation and also sends a bit of extra data to signal that we are submitting.  We can do whatever we want with this data in our forms controller save() method.  The idea in this example is that we can save the form as we go, then submit it at the end and navigate the page away or do something different.

## Custom Inputs

It is possible to create a completely custom input using jQuery.  Adding custom inputs is an advanced function and there are a few things to consider if you are going to go this route.

* Your code is responsible for rendering the entire field, including the label.
* You code is responsible for handling events, such as on change or on keypress.
* You code MUST return a jQuery object constainer.
* If you want the input to correctly interract with the MVVM data binder you will need to remember to add the `data-bind` attribute to the actual input (see example 2 below).

### Available Variables

There are two global variables available to your function:

* **field** contains the field definition, including the current value of the field.  This will at a minimum contain the properties *name* and *value*.  The rest is whatever you defined in your JSON field definition.
* **form** is the form data object.  You can directly access the form data by modifying this *dataBinder* object.

### Example 1 - A Simple Text Input

Below is an example of how to create a custom input.  This will generate a text input with no style and no label and is defined entirely within the JSON field definition file.

```json
{
    "pages": [],
    "fields": {
        "custom": {
            "type": "text",
            "label": "A Simple Custom Input",
            "render": "return $('<input type="text">').val(field.value);"
        }      
    }
}
  
```

**NOTE** - Keep in mind that the above example will not actually do anything because we have not handled any `onChange` events that update the form data.

### Example 2 - A Less Simple Text Input

This code creates a slightly more advanced text input similar to the built in text input generator.  This custom input is defined in your application javascript somewhere as a function call that must be accessible and included in your form controller (use `$this->require('yourscript.js');` in your controller as usual).

```javascript
function myCustomInput(field, form) {
    var group = $('<div class="form-group">');
    $('<label class="control-label">').attr('for', field.name).html(field.label).appendTo(group);
    $('<input type="text" placeholder="custom input" class="form-control">')
        .attr('data-bind', field.name)
        .val(field.value)
        .appendTo(group)
        .change(function () {
            form.data[field.name] = $(this).val();
        });
    return group;
};
```

Then we can use a similar JSON field definition as example 1, except we call our function and pass it the **field** and **form** variables.

```json
{
    "pages": [],
    "fields": {
        "custom": {
            "type": "text",
            "label": "A Simple Custom Input",
            "render": "return myCustomInput(field, form);"
        }      
    }
}
  
```

# Conclusion

That's it.  This module is VERY new and still being worked on so don't be surprised if things change quite dramatically.

