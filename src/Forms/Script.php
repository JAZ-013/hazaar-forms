<?php

namespace Hazaar\Forms;

class Script {

    static public $server_port = 3000;

    private $params = array();

    private $params_changed = true;

    private $params_js;

    final function __construct($params = null){

        if(strtolower(PHP_OS) !== 'linux')
            throw new \Exception('NodeJS script execution is only supported on Linux hosts.');

        if(!$this->nodejs_exists())
            throw new \Exception('NodeJS must be installed to use ' . __CLASS__);

        if(is_array($params))
            $this->populate($params);

    }

    private function nodejs_exists() {

        $return = shell_exec("which node");

        return !empty($return);

    }

    private function start_server(){

        $cmd = realpath(dirname(__FILE__)
            . DIRECTORY_SEPARATOR . '..'
            . DIRECTORY_SEPARATOR . '..'
            . DIRECTORY_SEPARATOR . 'libs'
            . DIRECTORY_SEPARATOR . 'codeserver.js')
            . ' ' . self::$server_port;

        if($cmd === false)
            throw new \Exception('Unable to find code execution server script!');

        $pipes = array();

        $descriptorspec = array(
            0 => array('pipe', 'r'),
            1 => array('pipe', 'w'),
            2 => array('pipe', 'w')
        );

        $proc = proc_open('node ' . $cmd . '&', $descriptorspec, $pipes);

        fclose($pipes[0]);

        do{

            $read = array($pipes[1]);

            $null = null;

        }while(stream_select($read, $null, $null, 0) === 0);

        return (proc_close($proc) !== -1);

    }

    public function populate($params){

        if(!is_array($params))
            return false;

        $this->params = $params;

        $this->params_changed = true;

        return true;

    }

    public function extend($params){

        if(!is_array($params))
            return false;

        $this->params = array_merge($this->params, $params);

        $this->params_changed = true;

        return true;

    }

    public function set($key, $value){

        $this->params[$key] = $value;

        $this->params_changed = true;

    }

    public function get($key){

        if(!isset($this->params[$key]))
            return null;

        return $this->params[$key];

    }

    public function __export_param($value, $quote = true, $export_dbv = false){

        if($value === null && $export_dbv === true){

            return array('value' => $value, 'label' => null, 'other' => null);

        }elseif($value instanceof \Hazaar\Model\dataBinderValue){

            if($export_dbv === true)
                return array('value' => $value->value, 'label' => $value->label, 'other' => $value->other);

            $value = $quote ? $this->__export_param($value->value, $quote, $export_dbv) : $value->value;

        }elseif($value instanceof \Hazaar\Model\ChildModel){

            $values = array();

            foreach($value as $key => $subValue)
                $values[$key] = $this->__export_param($subValue, $quote, $export_dbv);

            return $quote ? json_encode($values) : $values;

        }elseif ($value instanceof \Hazaar\Model\ChildArray){

            $values = array();

            foreach($value as $subValue)
                $values[] = $this->__export_param($subValue, $quote, $export_dbv);

            return $quote ? '[' . ((count($values) > 0) ? ' ' . implode(', ', $values) . ' ' : '' ). ']' : $values;

        }elseif($value instanceof \Hazaar\Date){

            return $value->sec();

        }

        if($quote !== true)
            return $value;

        if(is_bool($value)){

            $value = strbool($value);

        }elseif(is_null($value)){

            $value = 'null';

        }elseif (is_array($value)){

            $values = array();

            foreach($value as $subValue)
                $values[] = $this->__export_param($subValue, $quote, $export_dbv);

            $value = json_encode($values);

        }elseif ($value instanceof \stdClass){

            $values = array();

            foreach($value as $key => $subValue)
                $values[$key] = $this->__export_param($subValue, false, $export_dbv);

            $value = json_encode($values);

        }elseif ($quote === true && (is_string($value) || is_object($value))){

            $value = '"' . addslashes((string)$value) . '"';

        }

        return $value;

    }

    /**
     * Execute JS and return the result as a string
     *
     * @param mixed $code
     * @throws \Exception
     * @return boolean|string
     */
    public function execute($code, $value_key = null, $extra = null){

        if($this->params_changed === true){

            $this->params_js = "var form = new dataBinder(" . json_encode($this->params) . ");\n";

            foreach($this->params as $key => $value)
                $this->params_js .= "var $key = _get_data_item(form, '$key').save(true);\n";

            if(is_array($extra)){

                foreach($extra as $key => $value)
                    $this->params_js .= "var $key = " . json_encode($value) . "\n";

            }

            if($value_key !== null){

                $this->params_js .= "var formValue = _get_data_item(form, '$value_key');\n";

                $this->params_js .= "var formItem = formValue.parent;\n";

                $this->params_js .= "var value = formValue.save(true);\n";

                $this->params_js .= "var item = formItem.save(true);\n";

            }

            $this->params_changed = false;

        }

        $code = $this->params_js . trim($code);

        if(substr($code, -1) !== ';')
            $code .= ';';

        $options = array(
            'http' => array(
                'header'  => "Content-type: application/javascript\r\n",
                'method'  => 'POST',
                'content' => $code,
                'ignore_errors' => true
            )
        );

        $context = stream_context_create($options);

        $count = 0;

        while(($result = @file_get_contents('http://localhost:' . self::$server_port, false, $context)) === false){

            error_clear_last();

            if(++$count > 1)
                throw new \Exception('Unable to start code execution server!');

            $this->start_server();

        }

        if(substr($result, 0, 6) === 'ERROR:')
            throw new \Exception(substr($result, 7));

        return $result;

    }

    /**
     * Execute and evaluate JavaScript code.
     *
     * This function executes the JS code provided against the parameters currently set in the object and evaluates the
     * result as a boolean value.  Therefore, results such as string 'true/false', 'yes/no' and 0/1 will be converted
     * into booleans.  Pretty much anything that isn't identified as a string boolean will return false.
     *
     * @param mixed $code The JS code to execute.
     * @return boolean
     */
    public function evaluate($code, $value_key = null, $extra = null){

        return boolify($this->execute($code, $value_key, $extra));

    }

}