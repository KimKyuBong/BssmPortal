pipeline {
    agent any
    
    environment {
        NODEJS_HOME = tool 'NodeJS'
        PATH = "${NODEJS_HOME}/bin:${env.PATH}"
        BUILD_DIR = 'front/bssminfo'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                dir(BUILD_DIR) {
                    sh 'yarn install'
                }
            }
        }
        
        stage('Build') {
            steps {
                dir(BUILD_DIR) {
                    sh 'yarn build'
                }
            }
        }
        
        stage('Archive Artifacts') {
            steps {
                dir(BUILD_DIR) {
                    archiveArtifacts artifacts: 'out/**', fingerprint: true
                }
            }
        }
    }
    
    post {
        success {
            echo 'Build completed successfully!'
            echo 'The build artifacts are available in the front/bssminfo/out directory'
        }
        failure {
            echo 'Build failed!'
        }
    }
} 