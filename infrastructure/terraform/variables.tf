variable "aws_region" {
  default = "us-east-2"
}

variable "project_name" {
  default = "maintenance-dashboard"
}

variable "db_password" {
  sensitive = true
}
