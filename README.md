# Hazaar Forms

The Hazaar Forms module is able to simplify building advanced dynamic online forms.

More details will be coming soon.  For now here's a quick overview of using the forms.

## Form Definitions

Form definitions are just that.  They are JSON that defines the fields on your form and how the form will opperate.  This includes pages, sections, fields, validation and so forth.

### Prepare Your App

There is a new application sub-directory in use now called 'forms'.  So create the directory ```{project_base}\application\forms``` to store your form definitions.

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
        "female": "Female",
        "other": "I'm too lazy to look in my pants"
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

There are currently only 3 required elements. ```name```, ```pages``` and ```fields```.  

* name - This is just a friendly label that can be displayed on the form layout
* pages - The actual pages definition.  Each page contains one or more sections.  Each section contains one or more fields.  Fields are included either by just name, or by an object declaration.
* fields - Defines all the fields available in your form.  Fields can be defined once and used multiple times through your form.  Field definitions have a name, type, label and some type dependent attributes.

## Forms Controller

Your application will need to have a forms controller to handle data communication with the form frontend.  The ```Hazaar\Controller\Forms``` class is used for that and is basically just a ```Hazaar\Controller\Action``` class that you use every day, but with a few extra helpful methods to get data in and out of your form.

Here's one I prepared earlier:

```php
<?php

class IndexController extends \Hazaar\Controller\Form {

    private $cache;

    protected function init() {

        $this->cache = new \Hazaar\Cache('file', array('use_pragma' => false));

        $this->form('test1', array('id' => intval($this->request->get('id', 1))));

    }

    public function index() {

        $this->view->addHelper('gui');

        $this->view->requires('application.js');

        $this->view('index');

    }

    public function save($model, $params = array()){

        $this->cache->set('form-' . ake($params, 'id', 0), $model->get());

    }

    public function load($params = array()){

        if(!($out = $this->cache->get('form-' . ake($params, 'id', 0))))
            $out = array();

        return $out;

    }
}
```

Things to note: 

* ```init()``` and ```index()``` are defined in the Action class so work just the same as normal.
* ```save()``` and ```load()``` are simple methods that are required.  These methods get data in and out of the form module and allow your application to store and retrieve the actual form data anywhere it wants.  In this example we just cache it to a file.
* The call to ```$this->form('formname')``` is REQUIRED.  This is usually done in the init method, although this may change, and simply tells the forms module which form we are using.  It also gives your application a chance to define some extra parameters that will be sent back and forth with each GET/POST call.  This would normally be used for a record ID or some form data identifier.

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

Really the only important bit here is the call to ```$this->layout()``` which actually tells the forms controller where to put the form.

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


# Conclusion

That's it.  This module is VERY new and still being worked on so don't be surprised if things change quite dramatically.

