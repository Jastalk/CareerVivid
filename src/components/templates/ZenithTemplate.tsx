
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import { Mail, Phone, MapPin } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import { readableBorder } from '../../utils/templateInk';

export const ZenithTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="p-8 bg-white text-gray-800" style={bodyStyle}>
      <header className="mb-6 text-center">
        <div className="flex justify-center gap-2">
            <InlineEdit 
                value={personalDetails.firstName} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-4xl font-extrabold" 
                style={titleStyle}
                tagName="h1"
                placeholder="First Name"
            />
            <InlineEdit 
                value={personalDetails.lastName} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-4xl font-extrabold" 
                style={titleStyle}
                tagName="h1"
                placeholder="Last Name"
            />
        </div>
        <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-xl text-gray-600 block" 
            style={titleStyle}
            tagName="h2"
            placeholder="Job Title"
        />
      </header>

      <div className="bg-gray-100 p-3 rounded-lg flex justify-center items-center gap-x-6 text-sm mb-6">
         <div className="flex items-center"><Mail size={14} className="mr-2 flex-shrink-0 transform translate-y-px" /><InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" /></div>
         <div className="flex items-center"><Phone size={14} className="mr-2 flex-shrink-0 transform translate-y-px" /><InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" /></div>
         <div className="flex items-center"><MapPin size={14} className="mr-2 flex-shrink-0 transform translate-y-px" /><InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" /></div>
      </div>

      <main>
        <section className="mb-6">
          <h3 className="text-lg font-bold border-b-2 pb-1 mb-2" style={{...titleStyle, borderColor: readableBorder(themeColor)}}>PROFILE</h3>
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-sm leading-relaxed block whitespace-pre-wrap"
            tagName="p"
            placeholder="Summary..."
          />
        </section>

        <section className="mb-6">
          <h3 className="text-lg font-bold border-b-2 pb-1 mb-3" style={{...titleStyle, borderColor: readableBorder(themeColor)}}>EXPERIENCE</h3>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="mb-4">
              <InlineEdit 
                value={job.jobTitle} 
                fieldId={`employmentHistory[${index}].jobTitle`} 
                onFocus={onFocus} 
                className="text-md font-bold block" 
                style={titleStyle}
                tagName="h4"
                placeholder="Job Title"
              />
              <div className="text-sm text-gray-600 mb-1 flex gap-1">
                  <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                  <span>|</span>
                  <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                  <span>-</span>
                  <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
              </div>
              <InlineEdit 
                value={job.description} 
                fieldId={`employmentHistory[${index}].description`} 
                onFocus={onFocus} 
                className="text-sm leading-relaxed whitespace-pre-wrap block"
                tagName="p"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>

        <section className="grid grid-cols-2 gap-6">
            <div>
                <h3 className="text-lg font-bold border-b-2 pb-1 mb-2" style={{...titleStyle, borderColor: readableBorder(themeColor)}}>EDUCATION</h3>
                {education.map((edu, index) => (
                    <div key={edu.id} className="mb-2">
                        <InlineEdit 
                            value={edu.degree} 
                            fieldId={`education[${index}].degree`} 
                            onFocus={onFocus} 
                            className="text-md font-bold block" 
                            style={titleStyle}
                            tagName="h4"
                            placeholder="Degree"
                        />
                        <InlineEdit 
                            value={edu.school} 
                            fieldId={`education[${index}].school`} 
                            onFocus={onFocus} 
                            className="text-sm text-gray-600 block" 
                            tagName="p"
                            placeholder="School"
                        />
                    </div>
                ))}
            </div>
            <div>
                <h3 className="text-lg font-bold border-b-2 pb-1 mb-2" style={{...titleStyle, borderColor: readableBorder(themeColor)}}>SKILLS</h3>
                <div className="text-sm flex flex-wrap gap-1">
                    {skills.map((skill, index) => (
                        <React.Fragment key={skill.id}>
                            <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                            {index < skills.length - 1 && <span>/</span>}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </section>
      </main>
    </div>
  );
};
