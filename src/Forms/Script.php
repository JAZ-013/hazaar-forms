<?php

namespace Hazaar\Forms;

class Script {

    private $params = array();

    final function __construct($params = array()){

        if(strtolower(PHP_OS) !== 'linux')
            throw new \Exception('NodeJS script execution is only supported on Linux hosts.');

        if(!$this->nodejs_exists())
            throw new \Exception('NodeJS must be installed to use ' . __CLASS__);

        if(is_array($params))
            $this->params = $params;

    }

    private function nodejs_exists() {

        $return = shell_exec("which node");

        return !empty($return);

    }

    public function populate($params){

        if(!is_array($params))
            return false;

        $this->params = array_merge($this->params, $params);

        return true;

    }

    public function set($key, $value){

        $this->params[$key] = $value;

    }

    public function get($key){

        if(!isset($this->params[$key]))
            return null;

        return $this->params[$key];

    }

    /**
     * Execute JS and return the result as a string
     *
     * @param mixed $code
     * @throws \Exception
     * @return boolean|string
     */
    public function execute($code){

        $js = '';

        foreach($this->params as $key => $value)
            $js .= "var $key = " . json_encode($value) . ";\n";

        $js .= $code;

        $descriptorspec = array(
            0 => array("pipe", "r"),  // stdin is a pipe that the child will read from
            1 => array("pipe", "w"),  // stdout is a pipe that the child will write to
            2 => array("file", "/tmp/error-output.txt", "a") // stderr is a file to write to
        );

        $cwd = getcwd();

        $env = array();

        $process = proc_open('node -p', $descriptorspec, $pipes, $cwd, $env);

        if(!is_resource($process))
            return false;

        fwrite($pipes[0], $js);

        fclose($pipes[0]);

        $result = trim(stream_get_contents($pipes[1]));

        fclose($pipes[1]);

        $return_value = proc_close($process);

        if($return_value !== 0)
            throw new \Exception('Syntax error executing JavaScript code!');

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
    public function evaluate($code){

        $result = $this->execute($code);

        return boolify($result);

    }

}