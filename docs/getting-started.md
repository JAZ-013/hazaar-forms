# Overview

To start using forms, you need to create a controller to handle all the interaction between the client and the application.  While most of this interaction is built into the form controller itself, there are a number of methods that must be implemented/overridden in order for things to work correctly.  The [Hazaar\Controller\Form] controller is just like any other extendable controller in the [Hazaar MVC] framework.  In fact, the Forms controller itself extends the [Hazaar\Controller\Action] controller and so it provides all the same functionality such as automatic view rendering and cached responses, etc.

## Create a New Application

To get started we will use a the Hazaar Example Application as a starting point.  So from your command prompt run:

 ```sh
$ composer create-project hazaarlabs/example formstest
$ cd formstest
```

This will install the example application and all it's requirements.  

## Importing the ```hazaar-forms``` Library

Next we need to add the *hazaar-forms* library as a dependency, so run:

```sh
$ composer require hazaarlabs/hazaar-forms
```

You can then start up the built-in development web server by running:

```sh
$ composer serve
```

This will start up PHP's built-in web server on port 8080 and allow you to navigate to http://localhost:8080 and see the example application.

# Building a Simple Form

We will now create a simple form from the ground up, called **mytestform**.  This form will not do a whole other than display a few input fields, but it will be our starting point for creating more useful and complex forms.

There are 3 steps we need to take in order to get a new form up and running.

1. Create a controller that extends [Hazaar\Controller\Form]
1. Create a [Form Definition](form-definition)
1. Create a view that renders the form.

## Creating a Form Controller

Just like any other controller, create a new controller file in the *application/controllers* directory.  In our example, we will actually create it as the Index controller in the *application/controllers/Index.php* file.

```php
class IndexController extends \Hazaar\Controller\Form {

    protected function init() {

    } 

    public function index(){

        $this->view('index');

    }

}
```

So far we haven't implemented any form functionality and this will simply display the index view exactly as if we were using a standard [Hazaar\Controller\Action] controller.  To view a form, all we need to do is call one function and then modify our index view so the view renderer knows where to display the form.  

However, before we can do all that, we need to create a form definition to define what our form will look like.

## Creating a Form Definition

Form definitions are simply JSON files that define what the form looks like, what data is available in the form, and how the form actually operates.  For extensibility it is possible to use *includes* to include most sections and then create common files that are included into multiple forms.  This works with [field definitions](field definitions), PDF layouts and even individual pages within a form. But we'll get to that later.  

For now, let's just create a simple form with a couple of fields on it.  Forms are, by default, stored in the *application/forms* directory of your application.  It is possible to store forms anywhere once the form loader method is overridden, but the built-in loader will load form files from this directory.

Now, create a file called **mytestform.json** in the *application/forms* directory and paste the following JSON into the file.  If the *application/forms* directory does not exist (it probably won't yet), just create it.

```json
{
    "name": "My Test Form",
    "description": "Test form for testing tests.",
    "author": "jamie@hazaarlabs.com",
    "version": 1.0,
    "fields": {
        "testString": {
            "type": "text",
            "label": "Test String",
            "hint": "Enter your test string here"
        },
        "testNumber": {
            "type": "number",
            "label": "Test Number",
            "hint": "Enter a number between 0 and 100"
        }
    },
    "pages": [
        {
            "label": "Test Page One",
            "sections": [
                {
                    "label": "Test Section",
                    "fields": [ "testString", "testNumber" ]
                }
            ]
        }
    ]
}

```

We will go into all the different parts of this form definition later, but for now you can see that there are two major sections, *fields* and *pages*.  

* *fields* - This section defines the fields that are available in a form.  Each field has a *type* which indicates the type of data that will be store.  This can be *text*, *number*, *date*, *array* and more.
* *pages* - This sections defines the **pages** of the form.  Each page contains one or more **sections**.  Each section contains one or more **fields**.  

Pages, sections and fields all have a label and will be rendered in rows using [Bootstrap] grid layouts.  Please note that the page definitions do not affect the way data is stored.  To store data into *objects*, *arrays* or *arrays of objects of arrays* we can use *field groups*, but again, more on that later.  You can also display fields on multiple pages or even on the same page multiple times and their contents will stay in sync!

## Creating a Form View

A form view is exactly the same as any other [Hazaar MVC] PHTML view file *(note that we are only editing the controller view and we assume that the layout view is already working)*.  So, with whatever your view currently looks like, all you need to do is call the forms controller's ```layout()``` function where you want the form rendered.

```php
<div class="container p-5">
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">Test Form</div>
                <div class="card-body p-3">
                    <?=$this->layout('frmTest');?>
                </div>
            </div>
        </div>
    </div>
</div>
```

In this view, we are using the [Bootstrap] **card** class to layout the form inside a box with a header.

## Initialising the Form

Now that our form is defined and our view updated to call the ```layout()``` method, we need to load it up in the controller.  

To do that, simple add ```$this->form('mytestform`);``` to the ```index()``` method so that it looks like this:

```php
public function index(){

    $this->view('index');

    $this->form('mytestform`);

}
```

And that's pretty much it.  Assuming your application web server is running on localhost, you should be able to go to http://localhost and see your form!

# Saving & Loading Form Data

At this point though, your form won't really do much other than render on the page.  So that forms can be integrated nicely into the host application I decided to leave it up to the developers to implement onscreen navigation such as buttons or links that call functions on the form to change pages or save form data.  Don't worry, we tried to make this as easy as possible.

## The Form Save Method

To show how simple this is, we will add a button that saves our form data.  Before we can do this though, we need to implement the method that will receive our form data on our Index controller.  Modify the Index controller and add a method called ```form_save``` as below:

```php
protected function form_save($model, &$params = array()){

    $cache = new \Hazaar\Cache();

    $cache->set('testdata', $model->toArray());

    return true;

}
```

This method is called by the underlying Forms controller and passed a [\Hazaar\Forms\Model].  This is basically a [\Hazaar\Model\Strict] object with some extra form stuff on top of it.  The Forms model basically loads in the form definition and enforces field data types as well as validation rules and other such things.

Our ```form_save()``` method implementation simply converts the form data into an array and saves it into a cache object.

## The Form Load Method

To get the data back out when the form loads, we need to implement a ```form_load()``` method that loads the form data and returns it to the Forms controller.  It is almost the exact reverse of the above method:

```php
protected function form_load(&$params = array()){

    $cache = new \Hazaar\Cache();

    return $cache->get('testdata');

}
```

As you can see above, all we are doing here is loading the form data out of cache and returning it.  We don't need to convert it into a [\Hazaar\Forms\Model] object (although we can if we want) as this is done automatically, triggering the data type checks on the form data to ensure fields are the correct data types.  Because of this, form data can be saved and loaded in whatever manner you want, using whatever technologies you want.  You can store it to a file, or into a DBI database table, or however your would like.

## Triggering a Save

The last piece of the puzzle is telling the forms engine to save the form data.  To do that we will simply add a button to our view using a built-in helper function.  Because the Forms Controller is a supe'd up Action controller, we have the ability to use view helpers.  The forms library supplies it's own view helper which has a few useful functions for working with the forms engine.

To add a save button to the view, we simply need to call the ```btnSave()``` method on the forms view helper.  So modify your view so that it looks like this:

```php
<div class="container p-5">
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">Test Form</div>
                <div class="card-body p-3">
                    <?=$this->layout('frmTest');?>
                </div>
                <div class="card-footer">
                    <?=$this->form->btnSave('Save')->class('btn btn-primary');?>
                </div>
            </div>
        </div>
    </div>
</div>
```

The view helper call is ```$this->form->btnSave('Save')->class('btn btn-primary');``` and what this does is outputs a HTML button element with the content *Save*.  It also generates a tiny little bit of JavaScript that links to the form we have displayed so that when the user clicks this button, the form data is sent to the server and saved using our ```form_save()``` method.

# Form Parameters

The final piece when creating forms is being able to attach extra data to the form that isn't part of the form data itself and therefore can not be modified by the user.  An example use of this would be if you were using a form to edit a database record, such as a user or contact record.  This database record will probably be indexed and identified by an ID.  When we initialise the form we can attach this ID to the form as a *form parameter*.  You can of course attach as many parameters as you like/need and these parameters will be passed to all form functions so that they can be used to do things like lookup database records to update.

## Setting a Parameter

This is super easy to do.  In our ```index()``` method on our controller where we initialise the form, parameters are passed as an array argument to the function call.  So if we update out ```index()``` method from above to include an id, all we have to do is add an array parameter with an *id* attribute.

```php
public function index(){

    $this->view('index');

    $this->form('mytestform`, array('id' => 1234));

}
```

The form parameter is now set and there is an *id* attribute with an integer value of ```1234```.

## Using a Parameter

As we have already covered earlier, to implement the complete functionality of a form we need to override some built-in class methods on the form controller.  We have already overridden the ```form_save()``` and ```form_load()``` methods, so let's update those to use our new *id* parameter.

### Parameters with ```form_save()```

So the ```form_save()``` method takes two parameters.  The first is the form data model that is being saved and the second is the form parameter array.  So using the implementation of the ```form_save()``` method we created above, we will update the function to use our new *id* parameter to update a database record.

```php
protected function form_save($model, &$params = array()){

    $db = new \Hazaar\DBI\Adapter();

    return $db->testtable->update(array('id' => $params['id']), $model->toArray());

}
```

For details on the default implementation of the ```form_save()``` method see the [Hazaar\Controller\Form::form_save()](http://www.hazaarmvc.com/apidoc/class/Hazaar/Controller/Form#func_form_save) documentation.

### Parameters with ```form_load()```

So the ```form_load()``` method only takes a single parameter which is the form parameter array.  So using the implementation of the ```form_load()``` method we created above, we will update the function to use our new *id* parameter to retrieve a database record and return it as the data array used to populate the forms model.

```php
protected function form_load(&$params = array()){

    $db = new \Hazaar\DBI\Adapter();

    return $db->testtable->findOne(array('id' => $params['id']));

}
```

For details on the default implementation of the ```form_load()``` method see the [Hazaar\Controller\Form::form_load()](http://www.hazaarmvc.com/apidoc/class/Hazaar/Controller/Form#func_form_load) documentation.

# Wrap Up

So at this point you should have a very simple form that renders on the page, loads it's data if there is any, and allows the user to enter some text into an input box, a number into another input box and then save that.  Nothing too fancy, but you should be able to see the power that the Hazaar Forms library can provide using only a few simple function calls and files.

  [Hazaar MVC]: <http://www.hazaarmvc.com>
  [Hazaar\Controller\Form]: <http://www.hazaarmvc.com/apidoc/class/Hazaar/Controller/Form>
  [Hazaar\Controller\Action]: <http://www.hazaarmvc.com/apidoc/class/Hazaar/Controller/Action>
  [\Hazaar\Forms\Model]: <http://www.hazaarmvc.com/apidoc/class/Hazaar/Forms/Model>
  [\Hazaar\Model\Strict]: <http://www.hazaarmvc.com/apidoc/class/Hazaar/Model/Strict>
  [Bootstrap]: <http://getbootstrap.com>